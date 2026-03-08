"""Inference module — loads trained models and exposes prediction functions."""

import numpy as np
import pandas as pd
import torch
from typing import Dict, List, Optional
from pathlib import Path

from app.config import MODELS_DIR
from app.ml.demand_predictor import DemandPredictor, FEATURE_COLS
from app.ml.gnn_model import (
    WaterGNN, load_gnn, build_graph_data,
    NODE_FEATURE_DIM, EDGE_FEATURE_DIM,
)
from app.ml.synthetic_data import CAPACITY_M3


# ── Singleton model instances ──
_demand_predictor: Optional[DemandPredictor] = None
_gnn_model: Optional[WaterGNN] = None


def get_demand_predictor() -> DemandPredictor:
    """Get or load the demand predictor."""
    global _demand_predictor
    if _demand_predictor is None or not _demand_predictor.is_trained:
        _demand_predictor = DemandPredictor()
        _demand_predictor.load()
    return _demand_predictor


def get_gnn_model() -> WaterGNN:
    """Get or load the GNN model."""
    global _gnn_model
    if _gnn_model is None:
        _gnn_model = load_gnn()
    return _gnn_model


def predict_demand(features: Dict) -> Dict:
    """Predict 7-day demand from feature dict.

    Args:
        features: dict with keys matching FEATURE_COLS

    Returns:
        dict with pop_m3, industry_m3, agri_m3, total_demand_m3
    """
    predictor = get_demand_predictor()
    if not predictor.is_trained:
        return {"error": "Model not trained. Run `python -m app.ml.trainer` first."}

    df = pd.DataFrame([features])
    # Fill missing features with defaults
    for col in FEATURE_COLS:
        if col not in df.columns:
            df[col] = 0

    result = predictor.predict(df)
    return result.iloc[0].to_dict()


def predict_transfers(
    dam_states: List[Dict],
    edges: List[Dict],
) -> Dict:
    """Run GNN inference for transfer recommendations.

    Args:
        dam_states: list of {dam_id, fill_ratio, capacity_m3, inflow_m3, demand_7d, evap_m3, month}
        edges: list of {source_id, target_id, distance_km, is_natural}

    Returns:
        dict with node_deltas and edge_transfers
    """
    model = get_gnn_model()
    dam_ids = [d["dam_id"] for d in dam_states]
    n_dams = len(dam_ids)
    id_to_idx = {dam_id: i for i, dam_id in enumerate(dam_ids)}

    # Build node features [N, 7]
    node_features = np.zeros((n_dams, NODE_FEATURE_DIM))
    for i, d in enumerate(dam_states):
        cap = d.get("capacity_m3", CAPACITY_M3.get(d["dam_id"], 50_000_000))
        month = d.get("month", 6)
        node_features[i] = [
            d.get("fill_ratio", 0.5),
            cap / 1e9,
            d.get("inflow_m3", 0) / 1e6,
            d.get("demand_7d", 0) / 1e6,
            d.get("evap_m3", 0) / 1e6,
            np.sin(2 * np.pi * month / 12),
            np.cos(2 * np.pi * month / 12),
        ]

    # Build edge index [2, E] and features [E, 2]
    edge_src, edge_dst = [], []
    edge_feats = []
    edge_dam_pairs = []

    for e in edges:
        src_id, tgt_id = e["source_id"], e["target_id"]
        if src_id in id_to_idx and tgt_id in id_to_idx:
            edge_src.append(id_to_idx[src_id])
            edge_dst.append(id_to_idx[tgt_id])
            edge_feats.append([
                e.get("distance_km", 30) / 100.0,
                1 if e.get("is_natural", False) else 0,
            ])
            edge_dam_pairs.append((src_id, tgt_id))

    if not edge_src:
        return {"error": "No valid edges between provided dams."}

    edge_index = np.array([edge_src, edge_dst])
    edge_features = np.array(edge_feats)

    # Run inference
    data = build_graph_data(node_features, edge_index, edge_features)

    model.eval()
    with torch.no_grad():
        node_pred, edge_pred = model(data)

    # Build results
    node_deltas = {}
    for i, dam_id in enumerate(dam_ids):
        delta = node_pred[i].item()
        cap = dam_states[i].get("capacity_m3", CAPACITY_M3.get(dam_id, 50_000_000))
        node_deltas[dam_id] = {
            "recommended_delta_fill": round(delta, 4),
            "recommended_delta_m3": round(delta * cap, 0),
            "current_fill": dam_states[i].get("fill_ratio", 0.5),
            "projected_fill": round(dam_states[i].get("fill_ratio", 0.5) + delta, 4),
        }

    edge_transfers = []
    for i, (src_id, tgt_id) in enumerate(edge_dam_pairs):
        flow = edge_pred[i].item()
        src_cap = CAPACITY_M3.get(src_id, 50_000_000)
        volume_m3 = abs(flow) * src_cap * 0.01  # Scale to reasonable volumes

        if volume_m3 > 10_000:  # Minimum 10K m³ to be worth mentioning
            edge_transfers.append({
                "source": src_id,
                "target": tgt_id,
                "volume_m3": round(volume_m3, 0),
                "direction": "forward" if flow > 0 else "reverse",
                "priority": "URGENT" if volume_m3 > 1_000_000 else "HIGH" if volume_m3 > 500_000 else "NORMAL",
            })

    # Sort by volume
    edge_transfers.sort(key=lambda x: -x["volume_m3"])

    return {
        "node_deltas": node_deltas,
        "transfers": edge_transfers,
        "equity_score": round(1 - np.var([d.get("fill_ratio", 0.5) for d in dam_states]), 4),
    }
