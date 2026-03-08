"""Graph service — NetworkX operations on the water network."""

import networkx as nx
from sqlalchemy.orm import Session
from typing import Optional

from app.models.dam import DamNode, DamLevel, WaterEdge


_graph: Optional[nx.DiGraph] = None


def build_graph(db: Session) -> nx.DiGraph:
    """Build a NetworkX directed graph from the database."""
    global _graph

    G = nx.DiGraph()

    # Add nodes
    nodes = db.query(DamNode).all()
    for n in nodes:
        # Get latest level for this node
        latest_level = (
            db.query(DamLevel)
            .filter(DamLevel.dam_id == n.id)
            .order_by(DamLevel.date.desc())
            .first()
        )

        G.add_node(n.id, **{
            "name": n.name,
            "type": n.type,
            "lat": n.lat,
            "lon": n.lon,
            "basin": n.basin,
            "capacity_m3": n.capacity_m3,
            "fill_ratio": latest_level.fill_ratio if latest_level else None,
            "reserve_m3": latest_level.reserve_m3 if latest_level else None,
        })

    # Add edges
    edges = db.query(WaterEdge).all()
    for e in edges:
        G.add_edge(e.source_id, e.target_id, **{
            "relation_type": e.relation_type,
            "distance_km": e.distance_km,
            "status": e.status,
            "note": e.note,
        })

    _graph = G
    return G


def get_graph(db: Session) -> nx.DiGraph:
    """Get or build the cached graph."""
    global _graph
    if _graph is None:
        _graph = build_graph(db)
    return _graph


def get_snapshot(db: Session) -> dict:
    """Return a JSON-serializable snapshot of the graph."""
    G = get_graph(db)

    nodes = []
    for node_id, data in G.nodes(data=True):
        nodes.append({
            "id": node_id,
            "name": data.get("name", ""),
            "type": data.get("type", ""),
            "lat": data.get("lat"),
            "lon": data.get("lon"),
            "basin": data.get("basin"),
            "fill_ratio": data.get("fill_ratio"),
            "capacity_m3": data.get("capacity_m3"),
            "reserve_m3": data.get("reserve_m3"),
        })

    edges = []
    for src, tgt, data in G.edges(data=True):
        edges.append({
            "source_id": src,
            "target_id": tgt,
            "relation_type": data.get("relation_type", ""),
            "distance_km": data.get("distance_km"),
            "note": data.get("note"),
        })

    return {"nodes": nodes, "edges": edges}


def get_subgraph(db: Session, center_id: str, depth: int = 2) -> dict:
    """Return a subgraph centered on a specific node."""
    G = get_graph(db)

    if center_id not in G:
        return {"nodes": [], "edges": []}

    # Collect nodes within `depth` hops (both directions)
    nearby_nodes = {center_id}
    frontier = {center_id}

    for _ in range(depth):
        next_frontier = set()
        for n in frontier:
            next_frontier.update(G.successors(n))
            next_frontier.update(G.predecessors(n))
        frontier = next_frontier - nearby_nodes
        nearby_nodes.update(frontier)

    sub = G.subgraph(nearby_nodes)

    nodes = [
        {"id": n, **{k: v for k, v in data.items()}}
        for n, data in sub.nodes(data=True)
    ]
    edges = [
        {"source_id": s, "target_id": t, **{k: v for k, v in data.items()}}
        for s, t, data in sub.edges(data=True)
    ]

    return {"nodes": nodes, "edges": edges}


def invalidate_cache():
    """Force rebuild on next access."""
    global _graph
    _graph = None
