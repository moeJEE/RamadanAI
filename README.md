# 🌊 AquaRoute AI — PoC Gestion Prédictive de l'Eau

## Système intelligent de prévision et d'optimisation des transferts hydriques — Région Rabat-Salé-Kénitra (Maroc)

> **Version** : PoC v0.1  
> **Date** : 2026-03-07  
> **Région cible** : Rabat-Salé-Kénitra  
> **Pays** : Maroc

---

## Table des matières

1. [Objectif](#1-objectif)
2. [Concept fondamental](#2-concept-fondamental)
3. [Architecture globale](#3-architecture-globale)
4. [Données d'entrée — Inventaire & Schémas](#4-données-dentrée--inventaire--schémas)
5. [Pipeline d'ingestion](#5-pipeline-dingestion)
6. [Feature Engineering](#6-feature-engineering)
7. [Modèle de prédiction de la demande](#7-modèle-de-prédiction-de-la-demande)
8. [GNN — Modélisation du réseau hydrologique](#8-gnn--modélisation-du-réseau-hydrologique)
9. [Intégration Neo4j](#9-intégration-neo4j)
10. [API Endpoints](#10-api-endpoints)
11. [Alertes & Règles métier](#11-alertes--règles-métier)
12. [Dashboard & UX](#12-dashboard--ux)
13. [Tâches LLM-ready](#13-tâches-llm-ready)
14. [Tests & Validation](#14-tests--validation)
15. [Checklist d'implémentation](#15-checklist-dimplémentation)
16. [Annexes techniques](#16-annexes-techniques)

---

## 1. Objectif

Construire un **PoC SaaS** pour :

- **Prévoir la demande en eau** au niveau régional (population, industrie, agriculture)
- **Prédire les niveaux futurs** des barrages à partir de la météo, de l'évapotranspiration et de la demande
- **Recommander des transferts optimisés** entre barrages via modélisation en graphe (GNN + solveur)
- **Alerter proactivement** en cas de risque de crue ou de pénurie

---

## 2. Concept fondamental

### Équation centrale

```
Niveau Futur = Niveau Actuel + Apports (pluie) − Demande − Évaporation
```

### Pipeline IA

```
┌─────────────┐     ┌────────────────────────┐     ┌─────────────────────┐
│ API Météo   │────▶│ Prévision précipitations│────▶│ Estimation apports  │
│ (Open-Meteo)│     │ + évapotranspiration    │     │ (runoff coefficient)│
└─────────────┘     └────────────────────────┘     └──────────┬──────────┘
                                                              │
┌─────────────┐     ┌────────────────────────┐                ▼
│ Données     │────▶│ Prédiction demande     │────▶┌─────────────────────┐
│ historiques │     │ (LightGBM / LSTM)      │     │ Estimation niveau   │
└─────────────┘     └────────────────────────┘     │ futur par barrage   │
                                                   └──────────┬──────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │ GNN (PyTorch Geom.) │
                                                   │ Réseau de barrages  │
                                                   └──────────┬──────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │ Solveur optim.      │
                                                   │ (min-cost flow)     │
                                                   └──────────┬──────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │ Transferts optimaux │
                                                   │ Dam A → Dam B: X Mm³│
                                                   └─────────────────────┘
```

---

## 3. Architecture globale

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SOURCES DE DONNÉES                             │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌────────────────┐   │
│  │CSV Barrages│ │API Open-Meteo│  │Demande    │  │Monographie RSK │   │
│  │(niveaux)  │  │(7j forecast) │  │(estimations│  │(ressources    │   │
│  └─────┬─────┘  └──────┬───────┘  │ pop/agri) │  │ hydrologiques)│   │
│        │               │          └─────┬─────┘  └──────┬─────────┘  │
└────────┼───────────────┼────────────────┼───────────────┼────────────┘
         ▼               ▼                ▼               ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     INGESTION & STREAMING                             │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │ Kafka / Redpanda — Topics :                                   │    │
│  │   • dam.levels    • weather.forecasts    • demand.updates      │    │
│  └───────────────────────────┬───────────────────────────────────┘    │
│                              ▼                                        │
│  ┌─────────────────┐  ┌──────────────┐                               │
│  │ MinIO (raw JSON) │  │ Delta Tables │                               │
│  │ partitioned/date │  │ (Spark/delta │                               │
│  └─────────────────┘  │  -rs)        │                               │
│                        └──────┬───────┘                               │
└───────────────────────────────┼───────────────────────────────────────┘
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     ETL & FEATURE ENGINEERING                         │
│  Jobs Spark / Python :                                                │
│  • Join niveaux + météo + demande                                     │
│  • Rolling features (7j avg inflow, 14j trend)                        │
│  • net_balance = inflow − demand − evaporation                        │
└───────────────────────────────┬───────────────────────────────────────┘
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     MODÈLES IA                                        │
│  ┌──────────────────────┐  ┌────────────────────────────┐            │
│  │ Demand Predictor     │  │ GNN (PyTorch Geometric)    │            │
│  │ LightGBM/LSTM        │  │ 2–4 layers GATConv + MLP   │            │
│  │ → 7 jours horizon    │  │ → Transferts recommandés   │            │
│  └──────────┬───────────┘  └─────────────┬──────────────┘            │
│             │                             │                           │
│             ▼                             ▼                           │
│  ┌──────────────────────────────────────────────┐                    │
│  │ MLflow — Tracking & Model Registry           │                    │
│  └──────────────────────────────────────────────┘                    │
└───────────────────────────────┬───────────────────────────────────────┘
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     GRAPH DATABASE                                    │
│  ┌──────────────────────────────────────────────────┐                │
│  │ Neo4j :                                           │                │
│  │  Nodes — :Dam, :City, :Basin, :TreatmentPlant     │                │
│  │  Edges — [:CONNECTS], [:FEEDS], [:SUPPLIES]       │                │
│  │  GDS — Shortest paths, communities, centrality    │                │
│  └──────────────────────────────────────────────────┘                │
└───────────────────────────────┬───────────────────────────────────────┘
                                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     API & DASHBOARD                                   │
│  ┌────────────────────┐  ┌─────────────────────────────────┐         │
│  │ FastAPI Backend     │  │ Frontend (React + MapLibre)     │         │
│  │ /api/v1/...         │  │ Carte interactive, alertes,     │         │
│  └────────────────────┘  │ simulation transferts, chat IA  │         │
│                           └─────────────────────────────────┘         │
│  ┌────────────────────┐                                              │
│  │ Agent LangGraph    │ ← Explique recommandations en langage naturel│
│  └────────────────────┘                                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Données d'entrée — Inventaire & Schémas

### 4.1 Données disponibles dans ce repo

#### Fichier `rsk_water_nodes.csv` — Nœuds du réseau hydrique

| Colonne | Description |
|---------|-------------|
| `id` | Identifiant unique du nœud |
| `name` | Nom du nœud |
| `type` | Type : `basin`, `dam`, `water_complex`, `treatment_plant`, `city` |
| `lat`, `lon` | Coordonnées géographiques |
| `province_region` | Province ou préfecture |
| `basin` | Bassin hydraulique |
| `status` | Niveau de fiabilité : `verified`, `verified_project`, `approx_coords`, `estimated_coords` |
| `source_note` | Notes de source |

**Contenu actuel** : 15 nœuds — 2 bassins, 2 barrages, 1 complexe, 1 station de traitement, 8 villes + 1 ligne vide.

#### Fichier `rsk_water_edges.csv` — Relations hydrauliques

| Colonne | Description |
|---------|-------------|
| `source_id` | Nœud source |
| `target_id` | Nœud cible |
| `relation_type` | Type : `contains_major_dam`, `feeds`, `includes`, `interconnection_transfer`, `supplies_modeled`, `strategic_supply_zone` |
| `status` | Fiabilité : `verified`, `verified_project`, `verified_service_area + modeled_link`, `strategic_modeled` |
| `distance_km` | Distance en km (si disponible) |
| `note` | Description |

**Contenu actuel** : 13 relations dont 1 interconnexion inter-bassins (Sebou → SMBA, 67 km).

#### Fichier `rabat_sale_kenitra_water_nodes (1).csv` — Ressources hydrologiques (Monographie)

| Colonne | Description |
|---------|-------------|
| `Node` | Nom du nœud (barrage ou nappe) |
| `Type` | `Dam` ou `Aquifer` |
| `River/Basin` | Cours d'eau ou bassin associé |
| `Annual_Resource_Mm3` | Ressource annuelle renouvelable (Mm³/an) |
| `Capacity_Mm3` | Capacité maximale de stockage |
| `Irrigation_Area_ha` | Surface irriguée (ha) |
| `Electricity_Generation_kWh` | Production hydroélectrique annuelle (kWh) |
| `Notes` | Informations qualitatives |
| `Citation` | Référence à la monographie officielle |

**Contenu** : 3 barrages + 5 nappes phréatiques + 1 barrage hors-région.

### 4.2 Données barrages opérationnelles (à ingérer quotidiennement)

Schema `dam_levels` :

```
Date, Barrage, Capacite Normale (Mm3), Reserve (Mm3), Taux de Remplissage (%)
```

**Exemple** :

| Date | Barrage | Capacité (Mm³) | Réserve (Mm³) | Taux (%) |
|------|---------|-----------------|---------------|----------|
| 2026-03-06 | Sidi Mohammed Ben Abdellah | 974.788 | 933.936 | 95.81 |
| 2026-03-06 | Tamesna | 57.000 | 47.348 | 83.07 |
| 2026-03-06 | El Mellah | 35.000 | 33.709 | 96.31 |
| 2026-03-06 | El Himer | 14.000 | 3.113 | 22.24 |
| 2026-03-06 | Maazer | 13.000 | 2.342 | 18.02 |
| 2026-03-06 | O. Hassar | 2.240 | — | — |
| 2026-03-06 | Ain Kouachia | 11.000 | 10.155 | 92.32 |
| 2026-03-06 | Zamrine | 0.496 | 0.001 | 0.20 |

**Réserve totale RSK** : 1 030.60 Mm³

> **Règle** : si `Reserve = "-"` → calculer `reserve = capacite × taux_remplissage / 100` quand le taux est disponible

### 4.3 Données météo (API Open-Meteo)

**Endpoint utilisé** :

```
https://api.open-meteo.com/v1/forecast
  ?latitude=34.0209,34.0331,34.2610,33.9267
  &longitude=-6.8416,-6.7985,-6.5802,-6.9111
  &daily=temperature_2m_max,temperature_2m_min,precipitation_sum,
         precipitation_hours,et0_fao_evapotranspiration,wind_speed_10m_max
  &forecast_days=7&timezone=auto
```

**Variables récupérées** :

| Variable | Unité | Usage |
|----------|-------|-------|
| `temperature_2m_max` / `min` | °C | Estimation évaporation |
| `precipitation_sum` | mm | Calcul des apports (pluie) |
| `precipitation_hours` | h | Intensité des précipitations |
| `et0_fao_evapotranspiration` | mm | Évapotranspiration de référence FAO |
| `wind_speed_10m_max` | km/h | Facteur d'évaporation |

**Exemple de réponse (2026-03-07)** :

| Lieu | Temp Max | Temp Min | Précip. | Heures pluie | ET0 (mm) | Vent max |
|------|----------|----------|---------|---------------|----------|----------|
| Rabat | 16.1°C | 10.0°C | 0.0 mm | 0h | 1.98 | 11.6 km/h |
| Salé | 15.8°C | 9.7°C | 0.0 mm | 0h | 1.96 | 11.6 km/h |
| Kénitra | 15.7°C | 9.9°C | 0.1 mm | 1h | 1.80 | 13.8 km/h |
| Témara | 15.7°C | 9.3°C | 0.0 mm | 0h | 2.00 | 12.2 km/h |

> **Note** : le 2026-03-10, une forte précipitation de **14–17 mm** est prévue sur toute la région — scénario idéal pour tester les alertes de crue.

### 4.4 Données de demande (à collecter / synthétiser)

Schema `demand_base` :

```sql
region_id        VARCHAR   -- ex: 'RSK'
date             DATE
population_count INT       -- population totale desservie
pop_daily_m3     FLOAT     -- consommation domestique (m³/jour)
industry_daily_m3 FLOAT    -- consommation industrielle (m³/jour)
agriculture_daily_m3 FLOAT -- irrigation (m³/jour)
irrigation_area_ha FLOAT   -- surface irriguée (ha)
seasonal_factor  FLOAT     -- multiplicateur saisonnier (0.5–2.0)
```

> Si données réelles non disponibles : **synthétiser** à partir de la population (~150 L/pers/jour) et des hectares irrigués (`agri_m3 = irrigation_area_ha × crop_coef × irrigation_fraction`).

### 4.5 Niveaux de fiabilité des données

| Statut | Signification |
|--------|---------------|
| `verified` | Nom/fonction confirmés par source officielle |
| `verified_project` | Projet officiel confirmé |
| `approx_coords` | Coordonnées approximées à partir d'adresse/zone |
| `estimated_coords` | Coordonnées estimées |
| `modeled_link` | Lien logique de service, pas encore tracé conduite par conduite |

> ⚠️ La base est **solide pour une première modélisation**, mais ce n'est **pas encore un jumeau hydraulique exact**.

---

## 5. Pipeline d'ingestion

### 5.1 Architecture de streaming

```
┌────────────┐     ┌──────────────────────────────┐     ┌──────────────┐
│ Producteurs│────▶│ Kafka / Redpanda              │────▶│ Consommateurs│
│            │     │                                │     │              │
│ • CSV parse│     │ Topics :                       │     │ • MinIO raw  │
│ • API fetch│     │   dam.levels                   │     │ • Delta write│
│ • Manual   │     │   weather.forecasts            │     │ • Neo4j sync │
│   upload   │     │   demand.updates               │     │              │
└────────────┘     └──────────────────────────────┘     └──────────────┘
```

### 5.2 Étapes détaillées

1. **Ingestion CSV barrages** → Parse, normalise colonnes, convertit Mm³ → m³ (`× 1e6`), gère les valeurs manquantes, écrit en table Delta partitionnée par date
2. **Ingestion météo** → Appel API Open-Meteo toutes les 6h, stocke le JSON brut dans MinIO (raw/weather/), publie sur topic Kafka `weather.forecasts`
3. **Ingestion demande** → Upload CSV/JSON via endpoint, validation, stockage Delta
4. **Sync Neo4j** → Export des features vers Neo4j : mise à jour propriétés des nœuds (`current_m3`, `demand_forecast_7d`, `expected_inflow_24h`), mise à jour des arêtes

### 5.3 Stack technique (PoC)

| Composant | Technologie |
|-----------|-------------|
| Message broker | Redpanda (compatible Kafka, léger pour PoC) |
| Object storage | MinIO |
| Table format | Delta Lake (via delta-rs ou Spark) |
| Graph DB | Neo4j Community Edition |
| API | FastAPI (Python) |
| Orchestration | Docker Compose |
| ML tracking | MLflow |

---

## 6. Feature Engineering

### 6.1 Features par nœud (barrage)

| Feature | Formule / Description |
|---------|-----------------------|
| `fill_ratio` | `current_level_m3 / capacity_m3` |
| `forecasted_inflow_24h` | `precipitation_mm × catchment_area × runoff_coef` |
| `demand_forecast_7d` | Somme des demandes des régions desservies (7 jours) |
| `net_expected_change_7d` | `forecasted_inflow_7d − demand_forecast_7d − evap_7d` |
| `evap_daily_m3` | `ET0_mm × surface_reservoir_km2 × 1000` |
| `distance_to_nearest_dam` | Distance géographique au barrage le plus proche |
| `num_connected_nodes` | Nombre de nœuds connectés dans le graphe |
| `month` / `dayofyear` | Indicateurs saisonniers |
| `irrigation_season_flag` | Booléen : saison d'irrigation active |
| `historical_variability` | Écart-type des 30 derniers jours |
| `lag_1d`, `lag_7d`, `lag_14d`, `lag_30d` | Valeurs historiques décalées |

### 6.2 Features par arête

| Feature | Description |
|---------|-------------|
| `capacity_m3_per_day` | Capacité de transfert max (m³/jour) |
| `pump_cost_kwh_per_m3` | Coût énergétique du pompage |
| `effective_latency_hours` | Temps nécessaire pour le transfert |
| `distance_km` | Distance entre nœuds |
| `is_natural` | Relation naturelle (rivière) vs infrastructure |

---

## 7. Modèle de prédiction de la demande

### 7.1 Objectif

Prédire la demande quotidienne (m³/jour) par région pour un horizon de **7 jours**, décomposée par segment :

- `pop_m3` — consommation domestique
- `industry_m3` — consommation industrielle
- `agri_m3` — irrigation

### 7.2 Features d'entrée

- Historiques de consommation (lags 1, 7, 14, 30 jours)
- Population (statique)
- Activité industrielle (série temporelle)
- Prévisions météo (7 jours) : précipitation, température
- Indicateurs saisonniers (mois, jour de l'année, saison d'irrigation)

### 7.3 Modèles recommandés

| Modèle | Usage | Complexité |
|--------|-------|------------|
| **LightGBM** (baseline) | Multi-output, rapide, interprétable | ⭐⭐ |
| **LSTM / TCN** | Séquences temporelles + exogènes météo | ⭐⭐⭐ |
| **Agent LangGraph** | Recalcul en cas d'événement météo extrême | ⭐⭐⭐⭐ |

### 7.4 Output

```json
{
  "region": "RSK",
  "date": "2026-03-07",
  "forecasts": [
    {"date": "2026-03-07", "pop_m3": 12000, "industry_m3": 8000, "agri_m3": 25000, "total_m3": 45000},
    {"date": "2026-03-08", "pop_m3": 12100, "industry_m3": 7800, "agri_m3": 24500, "total_m3": 44400}
  ]
}
```

---

## 8. GNN — Modélisation du réseau hydrologique

### 8.1 Construction du graphe

- **Nœuds** : `:Dam` avec propriétés (`fill_ratio`, `capacity_m3`, `demand_forecast_7d`, `forecasted_inflow_24h`, `min_reserve_m3`)
- **Arêtes** : `[:CONNECTS]` avec propriétés (`capacity_m3_per_day`, `distance_km`, `pump_cost_kwh_per_m3`, `is_natural`)

### 8.2 Architecture GNN (PoC)

```
Input: Node features (F_dim) + Edge features (E_dim)
  │
  ▼
GATConv Layer 1 (attention-based message passing)
  │
  ▼
GATConv Layer 2
  │
  ▼
MLP Head (regression)
  │
  ▼
Output: recommended_delta_fill_m3 (par nœud)
         ou recommended_outflow_m3 (par arête)
```

- **Framework** : PyTorch + PyTorch Geometric (PyG)
- **Layers** : 2–4 `GATConv` + MLP head
- **Post-processing** : solveur LP/QP pour rendre les recommandations faisables (respect des capacités, réserves minimales)

### 8.3 Rôle du GNN

Le GNN apprend les relations telles que :

- La pluie en amont affecte les barrages en aval
- Les barrages en surplus peuvent alimenter ceux en déficit
- L'impact des distances et coûts énergétiques sur les transferts optimaux

### 8.4 Fonction de perte

```
L = w₁ × stress_metric + w₂ × energy_cost + w₃ × inequity_penalty
```

| Composante | Description |
|-----------|-------------|
| `stress_metric` | Pénalise les nœuds avec `fill_ratio < seuil` |
| `energy_cost` | Coût total de pompage des transferts |
| `inequity_penalty` | Variance du ratio de satisfaction par région |

### 8.5 Données d'entraînement

- **Supervisé** : historique des transferts (si disponible)
- **Synthétique** : simuler des scénarios météo/demande pour générer des trajectoires de politique

---

## 9. Intégration Neo4j

### 9.1 Schéma du graphe

```cypher
-- Nœuds
(:Basin {id, name, region})
(:Dam {id, name, lat, lon, capacity_m3, current_m3, fill_ratio, min_reserve_m3, annual_resource_m3})
(:WaterComplex {id, name, lat, lon})
(:TreatmentPlant {id, name, lat, lon})
(:City {id, name, lat, lon, population, daily_demand_m3})
(:Aquifer {id, name, type, annual_resource_m3, area_km2})

-- Relations
(:Basin)-[:CONTAINS_DAM]->(:Dam)
(:Dam)-[:FEEDS]->(:WaterComplex)
(:WaterComplex)-[:INCLUDES]->(:TreatmentPlant)
(:Dam)-[:INTERCONNECTION {distance_km, capacity_m3_per_day, project_status}]->(:Dam)
(:TreatmentPlant)-[:SUPPLIES {distance_km, modeled}]->(:City)
(:Dam)-[:STRATEGIC_SUPPLY {distance_km}]->(:City)
```

### 9.2 Import initial (Cypher)

```cypher
-- Exemple : import depuis rsk_water_nodes.csv
LOAD CSV WITH HEADERS FROM 'file:///rsk_water_nodes.csv' AS row
WITH row WHERE row.type = 'dam'
CREATE (:Dam {
  id: row.id,
  name: row.name,
  lat: toFloat(row.lat),
  lon: toFloat(row.lon),
  basin: row.basin,
  status: row.status
});

-- Exemple : import des relations depuis rsk_water_edges.csv
LOAD CSV WITH HEADERS FROM 'file:///rsk_water_edges.csv' AS row
MATCH (s {id: row.source_id}), (t {id: row.target_id})
CREATE (s)-[:CONNECTS {
  type: row.relation_type,
  distance_km: toFloat(row.distance_km),
  status: row.status
}]->(t);
```

### 9.3 Mise à jour en temps réel

```cypher
-- Mise à jour horaire des niveaux
MATCH (d:Dam {id: $dam_id})
SET d.current_m3 = $reserve_m3,
    d.fill_ratio = $fill_pct / 100.0,
    d.demand_forecast_7d = $forecast_total,
    d.expected_inflow_24h = $inflow_est,
    d.last_updated = datetime()
```

### 9.4 Export vers PyG

Script `neo4j_to_pyg.py` : connecte Neo4j, exécute des requêtes Cypher, transforme en tenseurs numpy au format PyTorch Geometric.

---

## 10. API Endpoints

### 10.1 Ingestion

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/v1/dams/ingest` | Upload CSV niveaux barrages |
| `POST` | `/api/v1/weather/ingest` | Payload forecast météo (7j) par barrage |
| `POST` | `/api/v1/demand/upload` | Upload consommation régionale (CSV/JSON) |

### 10.2 Consultation

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/api/v1/dams/{dam_id}/levels` | Historique niveaux d'un barrage |
| `GET` | `/api/v1/weather/{dam_id}?horizon=7` | Forecast météo 7j pour un barrage |
| `GET` | `/api/v1/demand/forecast?region=RSK&horizon=7` | Prévision demande 7j |
| `GET` | `/api/v1/graph/snapshot` | Snapshot du graphe Neo4j (nœuds + arêtes) |

### 10.3 Modèles & Recommandations

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/v1/models/demand/run` | Déclencher le prédicteur de demande |
| `POST` | `/api/v1/models/gnn/run` | Déclencher l'inférence GNN |
| `GET` | `/api/v1/recommendations/latest` | Dernières recommandations de transfert |
| `POST` | `/api/v1/simulate` | Simuler un scénario (pas d'exécution réelle) |

### 10.4 Exemple de payload (ingestion météo)

```json
{
  "dam_id": "dam_smba",
  "timestamp": "2026-03-07T00:00:00Z",
  "forecast": [
    {"date": "2026-03-07", "precip_mm": 0.0, "temp_mean": 13.0, "evap_mm": 1.98, "wind_kmh": 11.6},
    {"date": "2026-03-08", "precip_mm": 0.0, "temp_mean": 13.2, "evap_mm": 2.69, "wind_kmh": 10.4},
    {"date": "2026-03-09", "precip_mm": 0.4, "temp_mean": 13.9, "evap_mm": 2.17, "wind_kmh": 11.3},
    {"date": "2026-03-10", "precip_mm": 14.4, "temp_mean": 11.1, "evap_mm": 1.68, "wind_kmh": 14.6},
    {"date": "2026-03-11", "precip_mm": 0.6, "temp_mean": 11.3, "evap_mm": 2.66, "wind_kmh": 8.6},
    {"date": "2026-03-12", "precip_mm": 0.0, "temp_mean": 12.6, "evap_mm": 2.64, "wind_kmh": 21.4},
    {"date": "2026-03-13", "precip_mm": 0.4, "temp_mean": 15.5, "evap_mm": 2.50, "wind_kmh": 15.0}
  ]
}
```

### 10.5 Exemple FastAPI (endpoint météo)

```python
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List

app = FastAPI(title="AquaRoute AI", version="0.1.0")

class DailyForecast(BaseModel):
    date: str
    precip_mm: float
    temp_mean: float
    evap_mm: float
    wind_kmh: float = None

class WeatherPayload(BaseModel):
    dam_id: str
    timestamp: str
    forecast: List[DailyForecast]

@app.post("/api/v1/weather/ingest")
async def ingest_weather(data: WeatherPayload):
    # Sauvegarder dans MinIO (raw/) + publier Kafka
    save_raw_to_minio(data.dict())
    enqueue_etl_job("weather")
    return {"status": "ok", "dam_id": data.dam_id, "days_ingested": len(data.forecast)}
```

---

## 11. Alertes & Règles métier

| Règle | Condition | Action |
|-------|-----------|--------|
| **Risque crue** | `precip_24h > 15mm` **ET** `fill_ratio > 0.85` | Alerte `FLOOD_RISK`, recommander vidange préventive |
| **Transfert proactif** | `net_expected_change_7d < −X m³` pour une région | Recommander transfert préventif depuis barrages excédentaires |
| **Pic irrigation** | `agriculture_forecast_peak == True` | Prioriser la réserve pour zones agricoles |
| **Barrage critique** | `fill_ratio < 0.15` | Alerte `CRITICAL_LOW`, prioriser les apports |
| **Stress hydrique** | `demand_7d > 80%` de la réserve | Alerte `WATER_STRESS`, recommander rationnement |

> 🔒 **Sécurité** : l'agent IA ne doit **jamais actionner de pompes** sans confirmation humaine. Utiliser le endpoint `/simulate` avant `/execute`.

---

## 12. Dashboard & UX — Spécification détaillée

### 12.1 Stack technique Frontend

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| Framework | **React 18** + TypeScript | Écosystème riche, typage fort |
| Bundler | **Vite** | Build ultra-rapide, HMR |
| Carte | **MapLibre GL JS** | Open-source, performant, tuiles vector |
| Charts | **Recharts** ou **Nivo** | Graphiques réactifs, dark-mode natif |
| State | **Zustand** + **React Query (TanStack)** | Simple, léger, cache API automatique |
| Routing | **React Router v6** | Navigation SPA |
| UI Kit | **Radix UI** + CSS custom | Composants accessibles, style maîtrisé |
| Real-time | **WebSocket** (FastAPI) | Alertes temps réel, updates niveaux |
| Chat IA | **Vercel AI SDK** ou custom streaming | Réponses token par token |
| Icônes | **Lucide React** | Icônes modernes et cohérentes |

---

### 12.2 Design System — Tokens visuels

#### Palette de couleurs

```css
:root {
  /* Base — Dark theme principal */
  --color-bg-primary:     hsl(220, 20%, 8%);     /* Fond principal */
  --color-bg-secondary:   hsl(220, 18%, 12%);    /* Cards, panels */
  --color-bg-tertiary:    hsl(220, 16%, 16%);    /* Hover states */
  --color-bg-glass:       hsla(220, 20%, 14%, 0.7); /* Glassmorphism */

  /* Eau — Accents principaux */
  --color-water-primary:  hsl(200, 85%, 55%);    /* Bleu eau vif */
  --color-water-light:    hsl(195, 90%, 70%);    /* Bleu clair */
  --color-water-dark:     hsl(210, 80%, 35%);    /* Bleu profond */

  /* Sémantique */
  --color-success:        hsl(152, 70%, 50%);    /* Niveaux OK */
  --color-warning:        hsl(38, 95%, 55%);     /* Attention */
  --color-danger:         hsl(0, 80%, 58%);      /* Crue / critique */
  --color-info:           hsl(210, 80%, 60%);    /* Informatif */

  /* Niveaux de remplissage (gradient) */
  --fill-critical:        hsl(0, 80%, 50%);      /* < 15% */
  --fill-low:             hsl(30, 90%, 55%);     /* 15–40% */
  --fill-medium:          hsl(48, 85%, 55%);     /* 40–65% */
  --fill-good:            hsl(152, 70%, 50%);    /* 65–85% */
  --fill-full:            hsl(200, 85%, 55%);    /* > 85% */
  --fill-overflow-risk:   hsl(280, 65%, 60%);    /* > 95% + pluie */

  /* Texte */
  --color-text-primary:   hsl(220, 15%, 90%);
  --color-text-secondary: hsl(220, 12%, 60%);
  --color-text-muted:     hsl(220, 10%, 45%);

  /* Spacing */
  --space-xs: 4px;  --space-sm: 8px;  --space-md: 16px;
  --space-lg: 24px; --space-xl: 32px; --space-2xl: 48px;

  /* Radius */
  --radius-sm: 6px;  --radius-md: 10px;  --radius-lg: 16px;

  /* Shadows (Glassmorphism) */
  --shadow-card: 0 4px 24px hsla(220, 40%, 5%, 0.4);
  --shadow-glow: 0 0 20px hsla(200, 85%, 55%, 0.15);
}
```

#### Typographie

```css
/* Google Fonts: Inter (body) + JetBrains Mono (données) */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

body       { font-family: 'Inter', sans-serif; }
.data-value { font-family: 'JetBrains Mono', monospace; }

.text-hero    { font-size: 2rem;   font-weight: 700; }
.text-heading { font-size: 1.25rem; font-weight: 600; }
.text-body    { font-size: 0.875rem; font-weight: 400; }
.text-caption { font-size: 0.75rem; font-weight: 400; color: var(--color-text-muted); }
.text-metric  { font-size: 1.5rem; font-weight: 700; font-family: 'JetBrains Mono'; }
```

---

### 12.3 Architecture des pages — Navigation

```
┌─────────────────────────────────────────────────────────┐
│  ┌──────────┐                                           │
│  │ Sidebar  │   Page Content Area                       │
│  │          │                                           │
│  │ 🗺 Map    │   ┌─────────────────────────────────┐    │
│  │ 📊 Tableau│   │                                 │    │
│  │ 🔔 Alertes│   │     (Contenu de la page)        │    │
│  │ 🧪 Simul. │   │                                 │    │
│  │ 🤖 Agent  │   │                                 │    │
│  │ ⚙ Admin  │   └─────────────────────────────────┘    │
│  │          │                                           │
│  │ ────────── │  ┌──────────────────────────┐           │
│  │ Status    │  │ Mini-alert ticker (bottom)│           │
│  │ bar       │  └──────────────────────────┘           │
│  └──────────┘                                           │
└─────────────────────────────────────────────────────────┘
```

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Map (accueil)** | Carte interactive + KPIs globaux |
| `/dam/:id` | **Fiche barrage** | Détails, forecast, historique, graphe local |
| `/dashboard` | **Tableau de bord** | KPIs agrégés, classements, tendances |
| `/alerts` | **Alertes** | Flux temps réel, historique, configuration |
| `/simulate` | **Simulateur** | Scénarios what-if, comparaison |
| `/agent` | **Chat IA** | Conversation avec l'agent LangGraph |
| `/admin` | **Administration** | Import données, config seuils, gestion API keys |

---

### 12.4 Page 1 — Carte interactive (accueil `/`)

#### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Header : "AquaRoute AI" logo    [RSK ▾]  🔔 3 alertes   [👤]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────┐  ┌────────────────┐  │
│  │                                       │  │  KPIs Panel    │  │
│  │          CARTE MAPLIBRE GL            │  │                │  │
│  │                                       │  │ 💧 Réserve tot │  │
│  │   🔵 SMBA (95.8%)                     │  │   1030 Mm³     │  │
│  │          ╲                             │  │                │  │
│  │           ╲ ══> flux animé             │  │ 📈 Taux moyen  │  │
│  │            ╲                           │  │   62.4%        │  │
│  │   🟢 Tamesna (83%)                    │  │                │  │
│  │                                       │  │ ⚠️ Alertes     │  │
│  │   🔴 El Himer (22%)                   │  │   3 actives    │  │
│  │                                       │  │                │  │
│  │   🔴 Maazer (18%)                     │  │ 🌧 Pluie 7j    │  │
│  │                                       │  │   15.8 mm cum. │  │
│  │   🟡 Zamrine (0.2%)                   │  │                │  │
│  │                                       │  │ 🔋 Transferts  │  │
│  │   ── Heatmap net_change_7d ──         │  │   2 recomm.    │  │
│  │   (rouge=déficit, bleu=surplus)       │  │                │  │
│  │                                       │  └────────────────┘  │
│  │  [Layers ▾] [Satellite] [Forecast]    │                      │
│  └───────────────────────────────────────┘                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Mini tableau : classement barrages par taux remplissage  │   │
│  │  ████████████████████ SMBA        95.8%  ↑ +0.3%         │   │
│  │  ████████████████     El Mellah   96.3%  ↑ +0.1%         │   │
│  │  ████████████         Tamesna     83.1%  ↓ -0.5%         │   │
│  │  ███                  El Himer    22.2%  ↓ -1.2%         │   │
│  │  ██                   Maazer      18.0%  ↓ -0.8%         │   │
│  │  ▏                    Zamrine      0.2%  ↓ -0.1%         │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

#### Éléments de la carte

| Élément | Rendu | Interaction |
|---------|-------|-------------|
| **Barrages** | Cercle proportionnel à la capacité, couleur = `fill_ratio` | Click → ouvre fiche barrage |
| **Villes** | Petit point gris + label | Hover → tooltip demande |
| **Flux de transfert** | Ligne animée (particules) entre nœuds | Hover → volume + coût |
| **Heatmap** | Couche raster colorée `net_expected_change_7d` | Toggle on/off |
| **Zones d'alerte** | Halo pulsant rouge/orange autour du nœud | Click → détail alerte |
| **Interconnexions** | Ligne pointillée (projet) ou continue (existante) | Hover → capacité, distance |

#### Couleurs des marqueurs (par `fill_ratio`)

```
 0% ──── 15% ──── 40% ──── 65% ──── 85% ──── 95% ──── 100%+pluie
  🔴        🟠        🟡        🟢        🔵        🟣
 critique    bas      moyen     bon       plein    risque crue
```

---

### 12.5 Page 2 — Fiche barrage (`/dam/:id`)

#### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Retour    Sidi Mohammed Ben Abdellah           [⚡ Simuler]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  Niveau actuel   │  │  Prévision 7j    │  │  Statut        │ │
│  │                  │  │                  │  │                │ │
│  │    ██████████    │  │  Tendance : ↗    │  │  ✅ Normal     │ │
│  │    ██████████    │  │  +2.3 Mm³ net    │  │                │ │
│  │    ██████████    │  │                  │  │  Bassin :      │ │
│  │    ██████████    │  │                  │  │  Bouregreg     │ │
│  │    ████░░░░░░    │  │                  │  │                │ │
│  │                  │  │                  │  │  Capacité :    │ │
│  │  933.9 / 974.8   │  │                  │  │  974.8 Mm³     │ │
│  │    95.8%         │  │                  │  │                │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  MÉTÉO — Prévision 7 jours (source: Open-Meteo)          │  │
│  │                                                            │  │
│  │  Date   │ Précip  │ Temp   │ ET0    │ Vent   │ Apport est │  │
│  │  ────── │ ──────  │ ─────  │ ─────  │ ─────  │ ────────── │  │
│  │  07/03  │ 0.0 mm  │ 13.0°  │ 1.98   │ 11.6   │ 0 m³      │  │
│  │  08/03  │ 0.0 mm  │ 13.2°  │ 2.69   │ 10.4   │ 0 m³      │  │
│  │  09/03  │ 0.4 mm  │ 13.9°  │ 2.17   │ 11.3   │ 48K m³    │  │
│  │  10/03  │ 14.4 mm │ 11.1°  │ 1.68   │ 14.6   │ 1.72M m³  │  │
│  │  ░░░░░░░░░░░█████████░░░░░░░░░░░░░░░░░░░░  (bar chart)   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────┐  ┌────────────────────────────┐ │
│  │  DEMANDE DES RÉGIONS       │  │  HISTORIQUE 30 JOURS       │ │
│  │  ┌────────────────────┐    │  │                            │ │
│  │  │ Population  12K m³ │    │  │  ────────────╱─────────── │ │
│  │  │ Industrie    8K m³ │    │  │  ──────────╱───────────── │ │
│  │  │ Agriculture 25K m³ │    │  │  ────────╱─────────────── │ │
│  │  │ ─────────────────  │    │  │  (courbe fill_ratio)      │ │
│  │  │ Total       45K m³ │    │  │                            │ │
│  │  └────────────────────┘    │  │  [7j] [14j] [30j] [90j]   │ │
│  │                            │  │                            │ │
│  │  Villes desservies :       │  └────────────────────────────┘ │
│  │  • Rabat (4.5 km)          │                                 │
│  │  • Salé (6.4 km)           │                                 │
│  │  • Témara (9.8 km)         │                                 │
│  └────────────────────────────┘                                 │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  GRAPHE LOCAL — Connexions réseau                         │  │
│  │                                                            │  │
│  │              [Bassin Bouregreg]                             │  │
│  │                    │                                        │  │
│  │                    ▼                                        │  │
│  │   [Garde Sebou] ──67km──▶ [SMBA] ──▶ [Complexe Bouregreg] │  │
│  │                            │                                │  │
│  │                    ┌───────┼──────────┐                    │  │
│  │                    ▼       ▼          ▼                    │  │
│  │              [Rabat]  [Salé]    [Témara]                  │  │
│  │                                                            │  │
│  │  Visualisation interactive du sous-graphe Neo4j             │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

#### Composants de la fiche barrage

| Composant | Données affichées | Source API |
|-----------|-------------------|------------|
| **Jauge de niveau** | `fill_ratio` animé, `current_m3`, `capacity_m3` | `GET /api/v1/dams/{id}/levels` |
| **Prévision 7j** | Tendance nette (`inflow − demand − evap`), bar chart | `GET /api/v1/weather/{id}?horizon=7` + calculs |
| **Tableau météo** | Précip, temp, ET0, vent, apport estimé, par jour | `GET /api/v1/weather/{id}?horizon=7` |
| **Demande régions** | Décomposée (pop/industrie/agri), villes desservies | `GET /api/v1/demand/forecast?dam={id}` |
| **Historique** | Courbe de `fill_ratio` sur 30/90 jours | `GET /api/v1/dams/{id}/levels?range=30d` |
| **Graphe local** | Sous-graphe Neo4j centré sur ce barrage | `GET /api/v1/graph/subgraph?center={id}&depth=2` |
| **Alertes actives** | Liste des alertes liées à ce barrage | `GET /api/v1/alerts?dam={id}&status=active` |

---

### 12.6 Page 3 — Tableau de bord (`/dashboard`)

#### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Tableau de bord — Région RSK                 📅 2026-03-07     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ Réserve │  │ Taux    │  │ Alertes │  │ Transferts│           │
│  │ totale  │  │ moyen   │  │ actives │  │ recomm.  │           │
│  │ 1030 Mm³│  │ 62.4%   │  │    3    │  │    2     │           │
│  │ ↑ +0.2% │  │ ↓ -1.1% │  │ 🔴 1    │  │ ⚡ 45K m³ │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
│                                                                  │
│  ┌───────────────────────────┐  ┌────────────────────────────┐  │
│  │  Balance hydrique 7j      │  │  Répartition demande       │  │
│  │  (stacked area chart)     │  │  (donut chart)             │  │
│  │                           │  │                            │  │
│  │  ██████████████████       │  │      ╭──────────╮          │  │
│  │  ▓▓▓▓▓▓▓▓▓▓▓▓            │  │     │Population│          │  │
│  │  ░░░░░░░░░░               │  │     │ 27%      │          │  │
│  │                           │  │      ╰──────────╯          │  │
│  │  🟦 Apports  🟥 Demande   │  │  🟨 Agri 56%  🟦 Indus 17%│  │
│  │  🟧 Évaporation           │  │                            │  │
│  └───────────────────────────┘  └────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Classement barrages (triable par colonne)                │  │
│  │                                                            │  │
│  │  #  Barrage          Taux  Réserve    Tendance 7j  Statut │  │
│  │  1  El Mellah        96.3% 33.7 Mm³   ↗ +0.4%    🔵      │  │
│  │  2  SMBA             95.8% 933.9 Mm³  ↗ +0.3%    🔵      │  │
│  │  3  Ain Kouachia     92.3% 10.2 Mm³   → +0.0%    🟢      │  │
│  │  4  Tamesna          83.1% 47.3 Mm³   ↘ -0.5%    🟢      │  │
│  │  5  El Himer         22.2% 3.1 Mm³    ↘ -1.2%    🟠      │  │
│  │  6  Maazer           18.0% 2.3 Mm³    ↘ -0.8%    🟠      │  │
│  │  7  Zamrine           0.2% 0.001 Mm³  ↘ -0.1%    🔴      │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

### 12.7 Page 4 — Alertes (`/alerts`)

#### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Alertes        [Actives: 3]  [Résolues: 12]  [Config ⚙]       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 🔴 CRUE — SMBA — Risque élevé              il y a 2 min  │  │
│  │   Précipitation 14.4mm prévue le 10/03 + taux 95.8%      │  │
│  │   Recommandation : vidange préventive 2 Mm³ avant 09/03  │  │
│  │   [Voir barrage] [Simuler] [Acquitter]                    │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ 🟠 STRESS — El Himer — Niveau critique     il y a 1h     │  │
│  │   Taux de remplissage 22.2%, tendance baissière (-1.2%/j) │  │
│  │   Pas de pluie prévue 5j. Demande > 30% de la réserve    │  │
│  │   Recommandation : transfert 0.5 Mm³ depuis SMBA          │  │
│  │   [Voir barrage] [Simuler] [Acquitter]                    │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │ 🟠 STRESS — Maazer — Niveau critique       il y a 3h     │  │
│  │   Taux 18.0%, irrigation active, réserve < 15j de demande │  │
│  │   [Voir barrage] [Simuler] [Acquitter]                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Configuration des seuils d'alerte                        │  │
│  │                                                            │  │
│  │  Risque crue :    Précip > [15] mm ET fill > [85] %       │  │
│  │  Niveau critique : fill < [15] %                           │  │
│  │  Stress hydrique : demand_7d > [80] % de réserve          │  │
│  │  Pic irrigation :  [Auto-detect]                           │  │
│  │                                                            │  │
│  │  Notifications : [✓] Email  [✓] WebSocket  [ ] SMS        │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

#### Types d'alertes et rendu visuel

| Sévérité | Couleur | Icône | Exemples |
|----------|---------|-------|----------|
| **CRITICAL** | `--color-danger` rouge | 🔴 | Risque crue, débordement imminent |
| **WARNING** | `--color-warning` orange | 🟠 | Stress hydrique, niveau critique |
| **INFO** | `--color-info` bleu | 🔵 | Transfert recommandé, maintenance |
| **RESOLVED** | `--color-success` vert | 🟢 | Alerte précédente résolue |

---

### 12.8 Page 5 — Simulateur de scénarios (`/simulate`)

#### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Simulateur — Scénarios what-if                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─── PARAMÈTRES ──────────────┐  ┌─── RÉSULTATS ────────────┐ │
│  │                              │  │                          │ │
│  │ Scénario prédéfini : [▾]    │  │  Impact sur les barrages │ │
│  │  • Pluie forte (×2)         │  │                          │ │
│  │  • Sécheresse (0 mm, 14j)   │  │  SMBA:  95.8% → 97.2%   │ │
│  │  • Pic irrigation (+50%)    │  │         ⚠ risque déb.    │ │
│  │  • Coupure interconnexion   │  │                          │ │
│  │  • Custom                   │  │  El Himer: 22% → 19.1%  │ │
│  │                              │  │         🔴 critique      │ │
│  │ ── Paramètres custom ──     │  │                          │ │
│  │                              │  │  Maazer: 18% → 15.3%   │ │
│  │ Précipitation : [──●────]   │  │         🔴 critique      │ │
│  │                  ×1.5       │  │                          │ │
│  │                              │  │ ──────────────────────  │ │
│  │ Demande pop :   [────●──]   │  │                          │ │
│  │                  ×1.2       │  │ Transferts optimaux :    │ │
│  │                              │  │  SMBA → El Himer: 0.8Mm³│ │
│  │ Demande agri :  [──────●]   │  │  SMBA → Maazer: 0.4 Mm³ │ │
│  │                  ×1.5       │  │                          │ │
│  │                              │  │ Coût énergie : 12.3 kWh │ │
│  │ Horizon :       [7 jours ▾] │  │                          │ │
│  │                              │  │ Score équité : 0.82      │ │
│  │ [▶ Lancer simulation]       │  │                          │ │
│  │                              │  └──────────────────────────┘ │
│  └──────────────────────────────┘                               │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Comparaison : baseline vs simulation (line chart overlay) │  │
│  │                                                            │  │
│  │    ────── Baseline (sans intervention)                     │  │
│  │    ══════ Avec transferts recommandés                     │  │
│  │                                                            │  │
│  │   fill%│                                                  │  │
│  │    100 │──────══════════════                               │  │
│  │     80 │                                                  │  │
│  │     60 │         ────                                     │  │
│  │     40 │              ──────                              │  │
│  │     20 │              ══════════════                      │  │
│  │      0 │─────────────────────────────                     │  │
│  │        J1   J2   J3   J4   J5   J6   J7                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

#### Fonctionnement du simulateur

1. L'utilisateur choisit un **scénario prédéfini** ou ajuste des **sliders custom**
2. Click **"Lancer simulation"** → `POST /api/v1/simulate` avec les paramètres
3. Le backend exécute le pipeline complet (demand predictor + GNN) avec les données modifiées
4. Les résultats sont comparés au **baseline** (sans intervention) dans un chart overlay
5. Les transferts recommandés sont affichés avec coût énergétique et score d'équité

---

### 12.9 Page 6 — Agent conversationnel IA (`/agent`)

#### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Agent AquaRoute 🤖           [Nouveau chat]  [Historique]      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │  🤖 Bonjour ! Je suis l'agent AquaRoute. Je peux vous     │  │
│  │     aider à analyser la situation hydrique de la région    │  │
│  │     RSK. Posez-moi une question.                          │  │
│  │                                                            │  │
│  │  👤 Quels barrages sont à risque de débordement si la     │  │
│  │     pluie prévue le 10 mars se confirme ?                  │  │
│  │                                                            │  │
│  │  🤖 D'après les prévisions Open-Meteo, 14-17mm de pluie  │  │
│  │     sont attendus le 2026-03-10 sur la région RSK.         │  │
│  │                                                            │  │
│  │     ⚠️ **Barrage à risque élevé :**                        │  │
│  │     • **SMBA** — remplissage actuel 95.8%                 │  │
│  │       Apport estimé : +1.72 Mm³                           │  │
│  │       Si aucune action → dépassement capacité probable    │  │
│  │                                                            │  │
│  │     📊 **Recommandation :**                                │  │
│  │     → Vidange contrôlée de 2 Mm³ avant le 09/03           │  │
│  │     → Transfert préventif de 5 Mm³ via Complexe Bouregreg │  │
│  │                                                            │  │
│  │     [📈 Voir graphique] [🧪 Simuler ce scénario]          │  │
│  │                                                            │  │
│  │     Sources : Open-Meteo forecast, dam_levels (06/03),    │  │
│  │     GNN inference run #247                                │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  💬 Posez votre question...                    [Envoyer ▶] │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Suggestions rapides :                                           │
│  [Résumé situation RSK] [Risques 48h] [Transferts optimaux]     │
│  [Comparer barrages] [Prévision demande semaine]                │
└──────────────────────────────────────────────────────────────────┘
```

#### Capacités de l'agent (LangGraph)

| Outil agent | Description | Endpoint backend |
|-------------|-------------|-----------------|
| `get_dam_status` | Récupère les niveaux actuels | `GET /api/v1/dams/{id}/levels` |
| `get_weather_forecast` | Forecast météo 7j | `GET /api/v1/weather/{id}` |
| `get_demand_forecast` | Prévision de demande | `GET /api/v1/demand/forecast` |
| `run_gnn_inference` | Lance le GNN et retourne les recommandations | `POST /api/v1/models/gnn/run` |
| `run_simulation` | Exécute un scénario what-if | `POST /api/v1/simulate` |
| `get_alerts` | Liste les alertes actives/récentes | `GET /api/v1/alerts` |
| `explain_recommendation` | Génère une explication en langage naturel | Appel LLM interne |

#### Architecture de l'agent

```
┌──────────────────────────────────────────────┐
│  LangGraph Agent                             │
│                                              │
│  ┌─────────┐   ┌──────────┐   ┌──────────┐ │
│  │ Router  │──▶│ Planner  │──▶│ Executor │ │
│  │ (intent │   │ (which   │   │ (call    │ │
│  │  detect)│   │  tools?) │   │  tools)  │ │
│  └─────────┘   └──────────┘   └────┬─────┘ │
│                                     │       │
│                                     ▼       │
│                              ┌──────────┐   │
│                              │ Explainer│   │
│                              │ (format  │   │
│                              │  answer) │   │
│                              └──────────┘   │
└──────────────────────────────────────────────┘
```

---

### 12.10 Arbre des composants React

```
App
├── Layout
│   ├── Sidebar
│   │   ├── NavItem (Map / Dashboard / Alerts / Simulate / Agent / Admin)
│   │   ├── SystemStatus (API health, last sync time)
│   │   └── AlertBadge (nombre d'alertes actives)
│   ├── Header
│   │   ├── RegionSelector (dropdown RSK / futur: multi-régions)
│   │   ├── NotificationBell
│   │   └── UserMenu
│   └── AlertTicker (bandeau bottom, alertes défilantes)
│
├── Pages
│   ├── MapPage
│   │   ├── MapContainer (MapLibre GL)
│   │   │   ├── DamMarkerLayer (cercles + couleur fill_ratio)
│   │   │   ├── CityMarkerLayer (points, labels)
│   │   │   ├── TransferFlowLayer (lignes animées particules)
│   │   │   ├── HeatmapLayer (net_expected_change_7d)
│   │   │   ├── AlertPulseLayer (halos pulsants)
│   │   │   └── MapControls (layers toggle, zoom, style switch)
│   │   ├── KPIPanel (4 métriques clés, position right)
│   │   └── DamRankingBar (bottom, mini-barres horizontales)
│   │
│   ├── DamDetailPage
│   │   ├── DamHeader (nom, bassin, statut)
│   │   ├── LevelGauge (jauge animée fill_ratio)
│   │   ├── ForecastCard (tendance 7j nette)
│   │   ├── WeatherTable (tableau météo 7j)
│   │   ├── DemandBreakdown (donut pop/industrie/agri + villes)
│   │   ├── HistoryChart (courbe fill_ratio, 30/90j, zoomable)
│   │   ├── LocalGraph (sous-graphe Neo4j visualisé)
│   │   └── ActiveAlerts (alertes liées au barrage)
│   │
│   ├── DashboardPage
│   │   ├── KPIRow (4 cards : réserve, taux moyen, alertes, transferts)
│   │   ├── BalanceChart (stacked area: apports vs demande vs évap)
│   │   ├── DemandDonut (répartition pop/indus/agri)
│   │   └── DamTable (tableau triable, toutes colonnes)
│   │
│   ├── AlertsPage
│   │   ├── AlertFilter (tabs actives/résolues/toutes)
│   │   ├── AlertCard (sévérité, message, actions)
│   │   └── AlertConfig (seuils, canaux notification)
│   │
│   ├── SimulatePage
│   │   ├── ScenarioSelector (prédéfinis + custom)
│   │   ├── ParameterSliders (précip, demande pop/agri, horizon)
│   │   ├── ResultsPanel (impact par barrage, transferts, coûts)
│   │   └── ComparisonChart (baseline vs simulation overlay)
│   │
│   ├── AgentPage
│   │   ├── ChatHistory (bulles messages, markdown render)
│   │   ├── ChatInput (textarea + send button)
│   │   ├── SuggestionChips (requêtes rapides)
│   │   └── SourcesPanel (références aux données utilisées)
│   │
│   └── AdminPage
│       ├── DataImport (upload CSV, déclenchement ingestion)
│       ├── APIKeyManager (Open-Meteo, Neo4j, MinIO)
│       ├── ThresholdConfig (seuils alertes globaux)
│       └── SystemLogs (dernières ingestions, erreurs)
│
└── Shared Components
    ├── Tooltip (responsive, dark)
    ├── Badge (sévérité couleur)
    ├── ProgressBar (fill_ratio avec gradient)
    ├── Sparkline (mini-graphe inline)
    ├── StatusDot (online/offline/warning)
    └── SkeletonLoader (chargement animé)
```

---

### 12.11 Gestion d'état & flux de données

```
┌──────────────────────────────────────────────────┐
│                   React App                      │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Zustand Stores                            │  │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────┐  │  │
│  │  │ damStore │ │weatherSt.│ │ alertStore│  │  │
│  │  │ levels[] │ │forecast[]│ │ alerts[]  │  │  │
│  │  │ meta[]   │ │          │ │ config    │  │  │
│  │  └────┬─────┘ └────┬─────┘ └─────┬─────┘  │  │
│  │       │             │             │         │  │
│  │  ┌────┴─────────────┴─────────────┴─────┐  │  │
│  │  │  React Query (TanStack Query)        │  │  │
│  │  │  • Cache automatique (5 min)         │  │  │
│  │  │  • Refetch on window focus           │  │  │
│  │  │  • Polling: dam levels (1 min),      │  │  │
│  │  │    weather (15 min), alerts (30s)    │  │  │
│  │  └────────────────┬─────────────────────┘  │  │
│  └───────────────────┼────────────────────────┘  │
│                      │                            │
│           ┌──────────┴──────────┐                │
│           │   FastAPI Backend   │                │
│           │   /api/v1/...       │                │
│           └──────────┬──────────┘                │
│                      │                            │
│      ┌───────────────┼───────────────┐           │
│      ▼               ▼               ▼           │
│  ┌───────┐    ┌──────────┐    ┌──────────┐      │
│  │ Delta │    │  Neo4j   │    │ WebSocket│      │
│  │ Tables│    │  Graph   │    │ alerts   │      │
│  └───────┘    └──────────┘    └──────────┘      │
└──────────────────────────────────────────────────┘
```

#### Stratégie de polling / temps réel

| Donnée | Méthode | Fréquence | Justification |
|--------|---------|-----------|---------------|
| Niveaux barrages | Polling | 1 min | Données critiques, mise à jour fréquente |
| Météo forecast | Polling | 15 min | API Open-Meteo rafraîchit ~6h, throttle local |
| Alertes | **WebSocket** | Temps réel | Push instantané, pas de délai acceptable |
| Recommandations GNN | Polling | 5 min | Recalcul déclenché manuellement ou sur événement |
| Demande forecast | Polling | 30 min | Prévision quotidienne, slow-changing |

---

### 12.12 Responsive design — Breakpoints

| Breakpoint | Largeur | Adaptation |
|------------|---------|------------|
| **Desktop** | ≥ 1280px | Layout complet : sidebar + carte + panels |
| **Tablet** | 768–1279px | Sidebar collapse → hamburger menu, panels empilés |
| **Mobile** | < 768px | Carte plein écran, bottom sheet pour KPIs, swipe pour navigation |

#### Mobile-specific

- Carte : plein écran, bottom sheet drag-up pour KPIs
- Fiche barrage : scroll vertical, graphe local en accordion
- Alertes : notification push native (si PWA)
- Agent : interface chat optimisée mobile, suggestions en carousel horizontal

---

### 12.13 Animations & micro-interactions

| Élément | Animation | Technologie |
|---------|-----------|-------------|
| Flux de transfert sur carte | Particules animées le long des arêtes | MapLibre GL custom layer + `requestAnimationFrame` |
| Jauge de niveau barrage | Remplissage progressif au chargement | CSS `transition` + `clip-path` |
| Alertes entrantes | Slide-in + pulse halo | CSS `@keyframes` + `animation` |
| Changement de données | Number counter animation | `framer-motion` `animate` |
| Hover marqueur carte | Scale-up + tooltip fade-in | MapLibre event handlers |
| Navigation pages | Crossfade entre pages | React Router + `framer-motion` `AnimatePresence` |
| Chat agent (streaming) | Tokens apparaissent un par un | Vercel AI SDK stream rendering |
| Barres de classement | Width animation proportionnelle | CSS `transition: width 0.6s ease` |
| Heatmap | Opacity transition au toggle | MapLibre layer paint `transition` |

---

### 12.14 Accessibilité (a11y)

| Exigence | Implémentation |
|----------|----------------|
| Contraste | Tous les textes respectent WCAG AA (ratio ≥ 4.5:1) |
| Navigation clavier | Tous les éléments interactifs accessibles via Tab/Enter |
| Screen reader | Labels ARIA sur la carte, jauges, graphiques |
| Daltonisme | Icônes + texte en complément des couleurs (pas couleur seule) |
| Reduced motion | `@media (prefers-reduced-motion)` : désactive animations particules |
| Langue | UI bilingue FR/AR/EN avec `i18next` |

---

### 12.15 Exemple de composant React — `DamMarker`

```tsx
// components/map/DamMarker.tsx
import { useMemo } from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';

interface DamMarkerProps {
  dam: {
    id: string;
    name: string;
    lat: number;
    lon: number;
    fill_ratio: number;
    capacity_m3: number;
    current_m3: number;
    has_active_alert: boolean;
  };
  onClick: (damId: string) => void;
}

function getFillColor(ratio: number): string {
  if (ratio < 0.15) return 'var(--fill-critical)';
  if (ratio < 0.40) return 'var(--fill-low)';
  if (ratio < 0.65) return 'var(--fill-medium)';
  if (ratio < 0.85) return 'var(--fill-good)';
  if (ratio < 0.95) return 'var(--fill-full)';
  return 'var(--fill-overflow-risk)';
}

function getMarkerSize(capacity: number): number {
  // Scale between 20px and 60px based on capacity
  const minCap = 0.5e6;  // 0.5 Mm³
  const maxCap = 1000e6;  // 1000 Mm³
  const normalized = Math.log(capacity / minCap) / Math.log(maxCap / minCap);
  return 20 + Math.min(Math.max(normalized, 0), 1) * 40;
}

export default function DamMarker({ dam, onClick }: DamMarkerProps) {
  const color = useMemo(() => getFillColor(dam.fill_ratio), [dam.fill_ratio]);
  const size = useMemo(() => getMarkerSize(dam.capacity_m3), [dam.capacity_m3]);

  return (
    <Marker latitude={dam.lat} longitude={dam.lon} onClick={() => onClick(dam.id)}>
      <div
        className={`dam-marker ${dam.has_active_alert ? 'pulse-alert' : ''}`}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          backgroundColor: color,
          border: '2px solid rgba(255,255,255,0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 ${size / 2}px ${color}40`,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        role="button"
        aria-label={`${dam.name}: ${(dam.fill_ratio * 100).toFixed(1)}% rempli`}
      >
        <span className="text-caption" style={{ color: '#fff', fontWeight: 600, fontSize: size / 4 }}>
          {(dam.fill_ratio * 100).toFixed(0)}%
        </span>
      </div>
    </Marker>
  );
}
```

### 12.16 Exemple de composant — `LevelGauge`

```tsx
// components/dam/LevelGauge.tsx
import { useEffect, useState } from 'react';

interface LevelGaugeProps {
  fillRatio: number;       // 0 to 1
  currentM3: number;       // m³
  capacityM3: number;      // m³
  animate?: boolean;
}

export default function LevelGauge({ fillRatio, currentM3, capacityM3, animate = true }: LevelGaugeProps) {
  const [displayRatio, setDisplayRatio] = useState(animate ? 0 : fillRatio);

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => setDisplayRatio(fillRatio), 100);
      return () => clearTimeout(timer);
    }
    setDisplayRatio(fillRatio);
  }, [fillRatio, animate]);

  const formatMm3 = (m3: number) => `${(m3 / 1e6).toFixed(1)} Mm³`;

  return (
    <div className="level-gauge" style={{
      width: 160, height: 200, position: 'relative',
      background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-lg)',
      overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      {/* Water fill */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${displayRatio * 100}%`,
        background: `linear-gradient(to top, var(--color-water-dark), var(--color-water-primary))`,
        transition: animate ? 'height 1.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
      }} />

      {/* Labels */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 1,
      }}>
        <span className="text-metric" style={{ color: '#fff' }}>
          {(fillRatio * 100).toFixed(1)}%
        </span>
        <span className="text-caption" style={{ color: 'rgba(255,255,255,0.8)' }}>
          {formatMm3(currentM3)}
        </span>
        <span className="text-caption" style={{ color: 'rgba(255,255,255,0.5)' }}>
          / {formatMm3(capacityM3)}
        </span>
      </div>
    </div>
  );
}
```

### 12.17 Exemple requête agent

```
User: "Quels barrages sont à risque de débordement si la pluie prévue le 10 mars se confirme ?"
Agent: D'après les prévisions Open-Meteo, 14-17mm de pluie sont attendus le 2026-03-10.
       Le barrage Sidi Mohammed Ben Abdellah est actuellement à 95.8% de remplissage.
       → RISQUE ÉLEVÉ : recommandation de transfert préventif de 5 Mm³ vers le complexe Bouregreg
       et vidange contrôlée de 2 Mm³ avant le 09/03.
```

---

## 13. Tâches LLM-ready

### Tâche A — Ingestion CSV barrages

```
Écris un script Python 'ingest_barrages.py' qui :
1. Lit le CSV des niveaux de barrages
2. Normalise les colonnes (snake_case)
3. Convertit Mm³ → m³ (×1e6)
4. Gère les valeurs manquantes (Reserve='-' → calcul via capacité×taux/100)
5. Écrit en table Delta partitionnée par date dans MinIO
6. Inclut des tests unitaires
```

### Tâche B — Endpoint météo

```
Génère un endpoint FastAPI POST /api/v1/weather/ingest qui :
1. Valide le payload forecast (7 jours)
2. Stocke le JSON dans MinIO (raw/weather/)
3. Publie un message Kafka topic 'weather.forecasts'
4. Retourne un status de confirmation
Fournir Dockerfile et requirements.txt
```

### Tâche C — Import Neo4j

```
Écris un script 'neo4j_import.py' qui :
1. Importe rsk_water_nodes.csv (créer nœuds :Dam, :City, :Basin, etc.)
2. Importe rsk_water_edges.csv (créer relations avec propriétés)
3. Enrichit avec rabat_sale_kenitra_water_nodes.csv (annual_resource, irrigation_area)
4. Met à jour propriétés 'current_m3' depuis les données de niveaux
```

### Tâche D — Baseline demand predictor

```
Crée un script 'train_demand.py' qui :
1. Génère un dataset synthétique de demande (population, industrie, agriculture)
2. Crée les features (lags, météo, saison)
3. Entraîne un LightGBM multi-output
4. Expose une API d'inférence /api/v1/demand/forecast
5. Enregistre le modèle via MLflow
```

### Tâche E — GNN prototype

```
Génère un script 'train_gnn.py' qui :
1. Charge le graphe depuis Neo4j ou les CSV
2. Construit un modèle GNN 2-layer (GATConv) avec PyTorch Geometric
3. Entraîne sur des targets synthétiques 'recommended_delta_fill'
4. Sauvegarde le modèle via MLflow
5. Expose endpoint /api/v1/models/gnn/run
```

---

## 14. Tests & Validation

### 14.1 Scénarios fonctionnels

| # | Scénario | Résultat attendu |
|---|----------|------------------|
| 1 | Pluie forte (>15mm) sur dam SMBA (fill 95%) | GNN recommande vidange préventive → simulation évite overflow |
| 2 | Pic irrigation (saison haute) | GNN recommande transfert préventif depuis barrages excédentaires |
| 3 | Sécheresse prolongée (0mm, 14 jours) | Alertes stress hydrique, rationnement recommandé |
| 4 | Interconnexion Sebou → SMBA coupée | Rerouting via chemins alternatifs |

### 14.2 Tests unitaires

- Ingestion endpoints (validation payloads, gestion erreurs)
- ETL transforms (conversion unités, gestion NaN, joins)
- Import Neo4j (nœuds créés, relations correctes)
- Features (calculs fill_ratio, net_balance)

### 14.3 Tests d'intégration

- Pipeline bout-en-bout : ingestion → ETL → prédiction → recommandation
- Cohérence graphe Neo4j vs Delta tables

---

## 15. Checklist d'implémentation

> Ordre d'implémentation conseillé pour le PoC

- [ ] **Phase 1 — Infrastructure**
  - [ ] Docker Compose : MinIO + Redpanda + Neo4j + FastAPI
  - [ ] Structure du projet Python (modules, configs, requirements)

- [ ] **Phase 2 — Ingestion données**
  - [ ] `ingest_barrages.py` — CSV → Delta (normalisation, conversion Mm³→m³)
  - [ ] Endpoint météo — Open-Meteo → MinIO + Delta
  - [ ] Endpoint demande — Upload → Delta

- [ ] **Phase 3 — Graphe**
  - [ ] `neo4j_import.py` — Import nœuds et relations depuis CSV
  - [ ] Enrichissement avec données monographie
  - [ ] Mise à jour temps réel des propriétés

- [ ] **Phase 4 — Modèles IA**
  - [ ] Dataset synthétique de demande
  - [ ] `train_demand.py` — LightGBM baseline
  - [ ] `train_gnn.py` — GNN prototype (PyG)
  - [ ] MLflow tracking

- [ ] **Phase 5 — API & Dashboard**
  - [ ] Endpoints consultation (niveaux, météo, recommandations)
  - [ ] Frontend React + MapLibre (carte interactive)
  - [ ] Agent LangGraph (chat explicatif)
  - [ ] Alertes temps réel

- [ ] **Phase 6 — Validation**
  - [ ] Tests unitaires & intégration
  - [ ] Scénarios fonctionnels (crue, sécheresse, pic irrigation)
  - [ ] Documentation finale

---

## 16. Annexes techniques

### 16.1 Conversions d'unités

| De | Vers | Formule |
|----|------|---------|
| Mm³ (millions m³) | m³ | `× 1 000 000` |
| mm (précipitation) | m³ (apport) | `precip_mm × catchment_area_m² / 1000` |
| mm (ET0) | m³ (évaporation) | `ET0_mm × surface_reservoir_m² / 1000` |

### 16.2 Coefficient de ruissellement

```python
# Paramètre calibrable par bassin : 0.1 à 0.5
RUNOFF_COEFFICIENTS = {
    "Bouregreg-Chaouia": 0.25,   # bassin semi-aride, moyennement urbanisé
    "Sebou": 0.30,                # bassin plus arrosé, sol argileux
}

def estimate_inflow_m3(precip_mm, catchment_area_km2, runoff_coef):
    """Estime l'apport d'eau en m³ à partir de la précipitation"""
    catchment_area_m2 = catchment_area_km2 * 1e6
    return precip_mm * catchment_area_m2 * runoff_coef / 1000
```

### 16.3 Heuristique de génération de demande synthétique

```python
# Population : ~150 L/pers/jour
pop_daily_m3 = population * 0.150

# Agriculture : dépend de la culture et de la saison
agri_daily_m3 = irrigation_area_ha * crop_water_need_mm_per_day * 10  # mm→m³/ha

# Industrie : ~20% de la consommation domestique (estimation PoC)
industry_daily_m3 = pop_daily_m3 * 0.20
```

### 16.4 Mapping nœuds CSV → Neo4j

| CSV `type` | Neo4j Label | Notes |
|------------|-------------|-------|
| `basin` | `:Basin` | Entité logique de bassin |
| `dam` | `:Dam` | Ouvrage de surface |
| `water_complex` | `:WaterComplex` | Complexe de production |
| `treatment_plant` | `:TreatmentPlant` | Station de traitement |
| `city` | `:City` | Ville desservie |
| `Aquifer` (monographie) | `:Aquifer` | Nappe phréatique |

### 16.5 Coordonnées des points météo (Open-Meteo)

| Point | Latitude | Longitude | Ville de référence |
|-------|----------|-----------|-------------------|
| 0 | 34.0209 | -6.8416 | Rabat |
| 1 | 34.0331 | -6.7985 | Salé |
| 2 | 34.2610 | -6.5802 | Kénitra |
| 3 | 33.9267 | -6.9111 | Témara |

---

## Licence

Ce projet est un PoC (Proof of Concept) à vocation de recherche et démonstration.

## Contact

Projet AquaRoute AI — Gestion prédictive de l'eau, Région Rabat-Salé-Kénitra, Maroc.
