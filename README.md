# AquaRoute AI — Gestion Prédictive de l'Eau 🌊

> **Hackathon RamadanAI 2026** | 2ème place régionale RSK | Finaliste nationale

## 🎯 Qu'est-ce que AquaRoute AI ?

AquaRoute AI est une plateforme SaaS de **gestion prédictive de l'eau** pour la région Rabat-Salé-Kénitra au Maroc. Elle utilise l'intelligence artificielle pour :

- 📊 **Prédire la demande en eau** 7 jours à l'avance (LightGBM, R² = 0.99)
- 🔄 **Optimiser les transferts** inter-barrages via réseau de neurones graphiques (GNN)
- ⚠️ **Alerter en temps réel** sur les risques de crue et de pénurie
- 🧪 **Simuler des scénarios** what-if (sécheresse, pluie forte, Ramadan)
- 🤖 **Agent conversationnel IA** alimenté par Google Gemini

## 🏗 Architecture

```
┌─────────────────────────────────────────────────┐
│                  Frontend (React)                │
│   MapLibre GL · Shadcn UI · Zustand · Vite      │
├─────────────────────────────────────────────────┤
│                 Backend (FastAPI)                 │
│   7 API Routers · SQLAlchemy · NetworkX         │
├──────────┬──────────┬───────────┬───────────────┤
│ LightGBM │   GNN    │  Alert    │  AI Agent     │
│ Demand   │ Transfer │  Engine   │  (Gemini LLM) │
│ Predictor│ Optimizer│  4 Rules  │  5 Tools      │
├──────────┴──────────┴───────────┴───────────────┤
│              SQLite Database                     │
│   Dams · Levels · Edges · Weather · Forecasts   │
└─────────────────────────────────────────────────┘
```

## 🚀 Démarrage rapide

### Prérequis
- Python 3.11+
- Node.js 18+ (pour le frontend)

### Backend

```bash
cd backend

# Installer les dépendances
pip install -r requirements.txt

# Configurer la clé API Gemini (optionnel, pour l'agent LLM)
echo "GEMINI_API_KEY=your_key_here" > .env

# Entraîner les modèles ML
python -m app.ml.trainer

# Lancer le serveur
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Accéder au Swagger : http://localhost:8000/docs
```

### Initialiser la base de données

Après le lancement du serveur :
```bash
# Seed la DB avec les données CSV
POST http://localhost:8000/api/v1/dams/seed
```

## 📡 API Endpoints

| Préfixe | Description | Endpoints clés |
|---------|-------------|----------------|
| `/api/v1/dams` | Gestion des barrages | Liste, résumé KPI, ranking, niveaux historiques |
| `/api/v1/weather` | Prévisions météo | Ingestion, Open-Meteo live, requêtes par localisation |
| `/api/v1/graph` | Réseau hydrique | Snapshot NetworkX, sous-graphe |
| `/api/v1/alerts` | Alertes | Évaluation des 4 règles d'alerte |
| `/api/v1/simulate` | Simulation | Scénarios what-if (sécheresse, crue, irrigation) |
| `/api/v1/models` | Modèles ML | Prédiction demande, GNN, **SHAP explainabilité** |
| `/api/v1/agent` | Agent IA | Chat conversationnel (Gemini LLM) |

## 🧠 Modèles ML

### LightGBM — Prédiction de la demande

| Cible | MAE (m³/jour) | R² |
|-------|-------------|-----|
| Population | 3 820 | **0.9953** |
| Industrie | 1 307 | **0.9849** |
| Agriculture | 905 | **0.9833** |

**25 features** incluant :
- Météo (température, précipitations, ET0, vent)
- Calendrier (mois, saison d'irrigation, **Ramadan**)
- Structure (population, superficie irriguée, bassin versant)
- État (taux de remplissage, apports, évaporation)
- Lags temporels (1, 7, 14, 30 jours)

### GNN — Optimisation des transferts

- Architecture : **GATConv** 2 couches + MLP dual-head
- Sorties : delta_fill par barrage + débit recommandé par connexion
- Loss : `stress + énergie + inéquité`

### SHAP Explainabilité

Endpoint `POST /api/v1/models/demand/explain` — retourne les features les plus influentes pour chaque prédiction avec valeurs SHAP.

## 🌙 Spécificité Ramadan

Le modèle intègre des **patterns de consommation spécifiques au Ramadan** :
- Demande population **+15%** (pic iftar)
- Demande industrie **-15%** (horaires réduits)
- Feature binaire `is_ramadan` dans le modèle

## ⚠️ Règles d'alerte

| Règle | Condition | Sévérité |
|-------|-----------|----------|
| Risque de crue | précip > 15mm ET remplissage > 85% | CRITIQUE |
| Niveau critique | remplissage < 15% | CRITIQUE |
| Stress hydrique | remplissage < 40% | AVERTISSEMENT |
| Risque débordement | remplissage > 95% | AVERTISSEMENT |

## 🤖 Agent IA

Agent conversationnel alimenté par **Google Gemini 2.0 Flash** :
- Comprend le français naturel
- Dispatche automatiquement vers 5 outils
- Mémoire conversationnelle (10 derniers échanges)
- Fallback keyword si API indisponible

**Exemple** :
> **Q** : "Quel est le niveau des barrages ?"  
> **R** : 📊 Situation hydrique RSK — 5 barrages, 1217.5 Mm³ de réserve, 69.8% taux moyen...

## 📂 Structure du projet

```
RamadanAI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Settings + Gemini API key
│   │   ├── database.py          # SQLite + SQLAlchemy
│   │   ├── routers/             # 7 API routers
│   │   ├── services/            # Business logic
│   │   ├── ml/                  # LightGBM + GNN models
│   │   └── agent/               # Gemini LLM agent
│   ├── data/                    # CSV + SQLite DB + trained models
│   └── requirements.txt
├── dam-UI/                      # Frontend (Vite + Next.js)
└── README.md
```

## 👥 Équipe

Projet réalisé dans le cadre du **Hackathon RamadanAI 2026**  
🏆 2ème place — Phase régionale Rabat-Salé-Kénitra

## 📜 Licence

Ce projet est un Proof of Concept développé dans un cadre hackathon.
