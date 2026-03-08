"""Graph Neural Network for inter-dam transfer recommendations.

Architecture (README §8.2):
  Input → GATConv Layer 1 → ReLU+Dropout → GATConv Layer 2 → ReLU+Dropout → MLP Head → Output

Node features (§6.1):
  fill_ratio, capacity_m3 (normalized), forecasted_inflow_24h, demand_forecast_7d,
  evap_daily_m3, month_sin, month_cos

Edge features (§6.2):
  distance_km (normalized), is_natural

Output:
  Per-node: recommended_delta_fill (how much to change)
  Per-edge: recommended_outflow_m3 (transfer volume)

Loss (§8.4):
  L = w1 * stress_metric + w2 * energy_cost + w3 * inequity_penalty
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import joblib
from pathlib import Path
from typing import Optional, Dict

from app.config import MODELS_DIR

# Try to import torch_geometric, fallback gracefully
try:
    from torch_geometric.nn import GATConv
    from torch_geometric.data import Data
    HAS_PYG = True
except ImportError:
    HAS_PYG = False
    print("  [WARNING] torch-geometric not installed. GNN will use fallback MLP.")


# ── Feature dimensions ──
NODE_FEATURE_DIM = 7   # fill_ratio, capacity_norm, inflow, demand_7d, evap, month_sin, month_cos
EDGE_FEATURE_DIM = 2   # distance_norm, is_natural
HIDDEN_DIM = 64
NUM_HEADS = 4
DROPOUT = 0.2


class WaterGNN(nn.Module):
    """2-layer GATConv GNN for water transfer optimization."""

    def __init__(self, node_dim=NODE_FEATURE_DIM, edge_dim=EDGE_FEATURE_DIM,
                 hidden_dim=HIDDEN_DIM, num_heads=NUM_HEADS, dropout=DROPOUT):
        super().__init__()

        if not HAS_PYG:
            # Fallback MLP when PyG is not available
            self.fallback = True
            self.mlp = nn.Sequential(
                nn.Linear(node_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(hidden_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(hidden_dim, 1),  # delta_fill per node
            )
            return

        self.fallback = False

        # GATConv Layer 1
        self.conv1 = GATConv(
            in_channels=node_dim,
            out_channels=hidden_dim,
            heads=num_heads,
            dropout=dropout,
            edge_dim=edge_dim,
            concat=True,
        )

        # GATConv Layer 2
        self.conv2 = GATConv(
            in_channels=hidden_dim * num_heads,
            out_channels=hidden_dim,
            heads=1,
            dropout=dropout,
            edge_dim=edge_dim,
            concat=False,
        )

        # MLP Head — per-node output
        self.node_head = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1),  # recommended_delta_fill
        )

        # MLP Head — per-edge output
        self.edge_head = nn.Sequential(
            nn.Linear(hidden_dim * 2 + edge_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1),  # recommended_outflow_m3
        )

        self.dropout = dropout

    def forward(self, data):
        x, edge_index, edge_attr = data.x, data.edge_index, data.edge_attr

        if self.fallback:
            # Simple MLP fallback
            node_out = self.mlp(x)
            return node_out.squeeze(-1), torch.zeros(edge_index.size(1))

        # Layer 1
        x = self.conv1(x, edge_index, edge_attr=edge_attr)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        # Layer 2
        x = self.conv2(x, edge_index, edge_attr=edge_attr)
        x = F.relu(x)
        x = F.dropout(x, p=self.dropout, training=self.training)

        # Node predictions
        node_pred = self.node_head(x).squeeze(-1)  # [num_nodes]

        # Edge predictions
        src, dst = edge_index
        edge_features = torch.cat([x[src], x[dst], edge_attr], dim=-1)
        edge_pred = self.edge_head(edge_features).squeeze(-1)  # [num_edges]

        return node_pred, edge_pred


def compute_loss(node_pred, edge_pred, data, w1=1.0, w2=0.3, w3=0.5):
    """Custom loss function (README §8.4).

    L = w1 * stress_metric + w2 * energy_cost + w3 * inequity_penalty

    stress_metric: penalizes extreme fill ratios (too high or too low)
    energy_cost: penalizes large transfers
    inequity_penalty: penalizes variance in fill ratios after transfer
    """
    fill_ratios = data.x[:, 0]  # First feature is fill_ratio

    # Projected fill after applying recommended delta
    projected_fill = fill_ratios + node_pred

    # Stress metric: penalty for being outside [0.3, 0.85] optimal range
    stress_low = F.relu(0.3 - projected_fill) ** 2
    stress_high = F.relu(projected_fill - 0.85) ** 2
    stress_metric = (stress_low + stress_high).mean()

    # Energy cost: proportional to absolute transfer volume
    energy_cost = torch.abs(edge_pred).mean()

    # Inequity penalty: variance of projected fills
    inequity_penalty = projected_fill.var()

    loss = w1 * stress_metric + w2 * energy_cost + w3 * inequity_penalty

    return loss, {
        "stress": stress_metric.item(),
        "energy": energy_cost.item(),
        "inequity": inequity_penalty.item(),
        "total": loss.item(),
    }


def build_graph_data(
    node_features: np.ndarray,
    edge_index: np.ndarray,
    edge_features: np.ndarray,
) -> "Data":
    """Build a PyTorch Geometric Data object.

    Args:
        node_features: [N, NODE_FEATURE_DIM] array
        edge_index: [2, E] array of source-target pairs
        edge_features: [E, EDGE_FEATURE_DIM] array
    """
    if HAS_PYG:
        return Data(
            x=torch.tensor(node_features, dtype=torch.float32),
            edge_index=torch.tensor(edge_index, dtype=torch.long),
            edge_attr=torch.tensor(edge_features, dtype=torch.float32),
        )
    else:
        # Simple namespace fallback
        class SimpleData:
            pass
        d = SimpleData()
        d.x = torch.tensor(node_features, dtype=torch.float32)
        d.edge_index = torch.tensor(edge_index, dtype=torch.long)
        d.edge_attr = torch.tensor(edge_features, dtype=torch.float32)
        return d


def save_gnn(model: WaterGNN, path: Optional[Path] = None):
    """Save the GNN model."""
    save_dir = path or MODELS_DIR
    save_dir.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), save_dir / "water_gnn.pt")
    print(f"  GNN model saved to {save_dir / 'water_gnn.pt'}")


def load_gnn(path: Optional[Path] = None) -> WaterGNN:
    """Load the GNN model."""
    load_dir = path or MODELS_DIR
    model = WaterGNN()
    model_path = load_dir / "water_gnn.pt"
    if model_path.exists():
        model.load_state_dict(torch.load(model_path, map_location="cpu", weights_only=True))
        model.eval()
        print(f"  GNN model loaded from {model_path}")
    return model
