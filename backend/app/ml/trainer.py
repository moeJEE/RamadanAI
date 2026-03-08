"""Training pipeline — generates data, trains LightGBM + GNN, saves models."""

import sys
import numpy as np
import torch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.config import MODELS_DIR, DATA_DIR
from app.ml.synthetic_data import generate_full_dataset, CAPACITY_M3, CATCHMENT_AREA_KM2
from app.ml.demand_predictor import DemandPredictor
from app.ml.gnn_model import (
    WaterGNN, compute_loss, build_graph_data, save_gnn,
    NODE_FEATURE_DIM, EDGE_FEATURE_DIM,
)

# Ensure output dirs exist
MODELS_DIR.mkdir(parents=True, exist_ok=True)


def train_demand_model():
    """Step 1: Train LightGBM demand predictor."""
    print("\n══════════════════════════════════════")
    print("  STEP 1: Training Demand Predictor (LightGBM)")
    print("══════════════════════════════════════\n")

    # Generate synthetic dataset
    print("  Generating synthetic training data (2 years × 8 dams)...")
    df = generate_full_dataset(n_days=730, seed=42)

    # Save dataset for inspection
    dataset_path = DATA_DIR / "synthetic_dataset.csv"
    df.to_csv(dataset_path, index=False)
    print(f"  Dataset saved to {dataset_path}")

    # Train
    predictor = DemandPredictor()
    print("\n  Training LightGBM models...")
    metrics = predictor.train(df)

    # Save
    predictor.save()

    print("\n  Results:")
    for target, m in metrics.items():
        print(f"    {target}: MAE={m['mae']:.0f} m3/day, R2={m['r2']:.4f}")

    return predictor, df


def train_gnn_model(df=None):
    """Step 2: Train GNN for transfer optimization."""
    print("\n══════════════════════════════════════")
    print("  STEP 2: Training GNN (Transfer Optimizer)")
    print("══════════════════════════════════════\n")

    dam_ids = list(CAPACITY_M3.keys())
    n_dams = len(dam_ids)

    # Build adjacency from known connections
    # Simplified: connect dams in order + hub connections to SMBA
    edges_src = []
    edges_dst = []
    edge_features_list = []

    # SMBA is the hub — bidirectional connections to all dams
    smba_idx = dam_ids.index("dam_smba")
    for i, dam_id in enumerate(dam_ids):
        if i != smba_idx:
            # SMBA → dam_i
            edges_src.append(smba_idx)
            edges_dst.append(i)
            dist = 30 + i * 10  # approximate distances
            edge_features_list.append([dist / 100.0, 0])  # normalized distance, infrastructure

            # dam_i → SMBA
            edges_src.append(i)
            edges_dst.append(smba_idx)
            edge_features_list.append([dist / 100.0, 0])

    # Zamrine → Tamesna (natural river connection)
    if "dam_zamrine" in dam_ids and "dam_tamesna" in dam_ids:
        z_idx = dam_ids.index("dam_zamrine")
        t_idx = dam_ids.index("dam_tamesna")
        edges_src.extend([z_idx, t_idx])
        edges_dst.extend([t_idx, z_idx])
        edge_features_list.extend([[0.02, 1], [0.02, 1]])  # 2km, natural

    edge_index = np.array([edges_src, edges_dst])
    edge_features = np.array(edge_features_list)

    # Create model
    model = WaterGNN()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    # Training: generate random graph states and optimize
    n_epochs = 200
    rng = np.random.default_rng(42)

    print(f"  Training for {n_epochs} epochs on {n_dams} dam nodes...")

    best_loss = float('inf')
    for epoch in range(n_epochs):
        model.train()

        # Generate random node features (simulating different states)
        node_features = np.zeros((n_dams, NODE_FEATURE_DIM))
        for i, dam_id in enumerate(dam_ids):
            cap = CAPACITY_M3.get(dam_id, 50_000_000)
            fill = rng.uniform(0.1, 0.95)
            month = rng.integers(1, 13)

            node_features[i] = [
                fill,                                          # fill_ratio
                cap / 1e9,                                     # capacity_normalized
                rng.uniform(0, cap * 0.01),                   # forecasted_inflow_24h
                rng.uniform(cap * 0.001, cap * 0.005) * 7,    # demand_forecast_7d
                rng.uniform(0, cap * 0.001),                  # evap_daily_m3
                np.sin(2 * np.pi * month / 12),               # month_sin
                np.cos(2 * np.pi * month / 12),               # month_cos
            ]

        data = build_graph_data(node_features, edge_index, edge_features)

        # Forward pass
        node_pred, edge_pred = model(data)

        # Compute custom loss
        loss, loss_parts = compute_loss(node_pred, edge_pred, data)

        # Backward
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        if loss.item() < best_loss:
            best_loss = loss.item()

        if (epoch + 1) % 50 == 0:
            print(f"    Epoch {epoch+1}/{n_epochs} — Loss: {loss.item():.4f} "
                  f"(stress={loss_parts['stress']:.4f}, energy={loss_parts['energy']:.4f}, "
                  f"inequity={loss_parts['inequity']:.4f})")

    # Save
    save_gnn(model)
    print(f"\n  Best loss: {best_loss:.4f}")

    return model


def main():
    """Full training pipeline."""
    print("╔═══════════════════════════════════════╗")
    print("║  AquaRoute AI — Model Training        ║")
    print("╚═══════════════════════════════════════╝")

    # Step 1: Demand predictor
    predictor, df = train_demand_model()

    # Step 2: GNN
    gnn = train_gnn_model(df)

    print("\n═══════════════════════════════════════")
    print("  TRAINING COMPLETE")
    print(f"  Models saved to: {MODELS_DIR}")
    print("═══════════════════════════════════════")


if __name__ == "__main__":
    main()
