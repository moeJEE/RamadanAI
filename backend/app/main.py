"""AquaRoute AI — FastAPI Backend entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import dams, weather, graph, alerts, simulate, models as models_router
from app.routers import agent as agent_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    # -- Startup --
    init_db()
    print("✓ Database initialized")
    yield
    # -- Shutdown --
    print("Shutting down AquaRoute AI backend…")


app = FastAPI(
    title=settings.APP_TITLE,
    version=settings.APP_VERSION,
    description="Backend API pour la gestion prédictive de l'eau — Région RSK",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(dams.router,    prefix="/api/v1/dams",    tags=["Barrages"])
app.include_router(weather.router, prefix="/api/v1/weather", tags=["Météo"])
app.include_router(graph.router,   prefix="/api/v1/graph",   tags=["Graphe"])
app.include_router(alerts.router,  prefix="/api/v1/alerts",  tags=["Alertes"])
app.include_router(simulate.router, prefix="/api/v1",        tags=["Simulation"])
app.include_router(models_router.router, prefix="/api/v1/models", tags=["Modèles IA"])
app.include_router(agent_router.router, prefix="/api/v1/agent", tags=["Agent IA"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": settings.APP_TITLE,
        "version": settings.APP_VERSION,
        "status": "operational",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
