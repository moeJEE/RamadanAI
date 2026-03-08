"""AquaRoute AI Agent — rule-based NLU with tool dispatch.

PoC agent that:
1. Parses user intent from natural language (keyword matching)
2. Routes to the appropriate tool
3. Formats the tool output into a natural language response

Can be upgraded to LangGraph + LLM in production.
"""

import json
import re
from typing import Dict, Optional, Tuple
from sqlalchemy.orm import Session

from app.agent.tools import TOOLS


# ── Intent detection via keyword matching ──

def detect_intent(message: str) -> Tuple[str, Dict]:
    """Detect user intent from message text.

    Returns (tool_name, params) tuple.
    """
    msg = message.lower().strip()

    # Check for simulation triggers with parameters
    if any(kw in msg for kw in ["sécheresse", "secheresse", "drought"]):
        return "simulation", {"scenario": "drought", "precip_mult": 0.2, "demand_mult": 1.3}
    if any(kw in msg for kw in ["pluie forte", "inondation", "crue", "heavy rain", "flood"]):
        return "simulation", {"scenario": "heavy_rain", "precip_mult": 3.0, "demand_mult": 1.0}
    if any(kw in msg for kw in ["irrigation", "pic", "ete", "été", "summer"]):
        return "simulation", {"scenario": "irrigation_peak", "precip_mult": 0.5, "demand_mult": 1.5}

    # Score each tool by keyword matches
    scores = {}
    for tool_name, tool_info in TOOLS.items():
        score = sum(1 for kw in tool_info["keywords"] if kw in msg)
        if score > 0:
            scores[tool_name] = score

    if scores:
        best_tool = max(scores, key=scores.get)
        return best_tool, {}

    # Default: show dam status
    return "dam_status", {}


def format_response(tool_name: str, data: Dict) -> str:
    """Format tool output into a natural language response."""

    if "error" in data:
        return f"Desolee, une erreur est survenue : {data['error']}"

    if tool_name == "dam_status":
        return _format_dam_status(data)
    elif tool_name == "alerts":
        return _format_alerts(data)
    elif tool_name == "weather":
        return _format_weather(data)
    elif tool_name == "simulation":
        return _format_simulation(data)
    elif tool_name == "network":
        return _format_network(data)
    else:
        return json.dumps(data, ensure_ascii=False, indent=2)


def _format_dam_status(data: Dict) -> str:
    """Format dam status response."""
    resume = data.get("resume", {})
    lines = [
        f"**Situation hydrique RSK** (derniere mise a jour)\n",
        f"Nombre de barrages : {resume.get('nombre', 0)}",
        f"Reserve totale : {resume.get('reserve_totale_Mm3', '?')} Mm3 / {resume.get('capacite_totale_Mm3', '?')} Mm3",
        f"Taux moyen de remplissage : {resume.get('taux_moyen', '?')}\n",
        "**Detail par barrage** :\n",
    ]

    for dam in data.get("barrages", []):
        status_emoji = {
            "critical": "[CRITIQUE]",
            "low": "[BAS]",
            "medium": "[MOYEN]",
            "good": "[BON]",
            "full": "[PLEIN]",
            "overflow_risk": "[RISQUE DEBORDEMENT]",
        }.get(dam["statut"], "")

        lines.append(
            f"- **{dam['nom']}** : {dam['taux_remplissage']} "
            f"({dam['reserve_Mm3']} / {dam['capacite_Mm3']} Mm3) {status_emoji}"
        )

    return "\n".join(lines)


def _format_alerts(data: Dict) -> str:
    """Format alerts response."""
    alertes = data.get("alertes", [])
    if not alertes:
        return data.get("message", "Situation nominale, aucune alerte.")

    lines = [
        f"**{len(alertes)} alerte(s) active(s)** "
        f"({data.get('nombre_critiques', 0)} critique(s), "
        f"{data.get('nombre_avertissements', 0)} avertissement(s))\n",
    ]

    for a in alertes:
        severity_tag = "[CRITIQUE]" if a["severite"] == "CRITICAL" else "[AVERTISSEMENT]"
        lines.append(f"{severity_tag} **{a['barrage']}** — {a['message']}")
        lines.append(f"  Recommandation : {a['recommandation']}\n")

    return "\n".join(lines)


def _format_weather(data: Dict) -> str:
    """Format weather response."""
    previsions = data.get("previsions", {})
    if not previsions:
        return data.get("message", "Aucune prevision disponible.")

    lines = ["**Previsions meteo RSK** :\n"]
    for location, forecasts in previsions.items():
        lines.append(f"**{location}** :")
        for f in forecasts[:3]:  # Show 3 days
            lines.append(
                f"  - {f['date']} : {f['precip_mm']} mm pluie, "
                f"{f.get('temp_min', '?')}-{f.get('temp_max', '?')} deg C"
            )
        lines.append("")

    return "\n".join(lines)


def _format_simulation(data: Dict) -> str:
    """Format simulation response."""
    lines = [
        f"**Simulation : {data.get('scenario', '?')}** (horizon {data.get('horizon', '?')})\n",
    ]

    # Dam projections
    for dam in data.get("barrages", []):
        risk = f" [RISQUE: {dam['risque']}]" if dam["risque"] != "aucun" else ""
        lines.append(
            f"- **{dam['nom']}** : {dam['actuel']} -> {dam['projete']} ({dam['variation']}){risk}"
        )

    # Transfers
    transfers = data.get("transferts_recommandes", [])
    if transfers:
        lines.append(f"\n**Transferts recommandes** ({len(transfers)}) :")
        for t in transfers:
            lines.append(f"  - {t['de']} -> {t['vers']} : {t['volume_Mm3']} Mm3")

    lines.append(f"\nScore d'equite : {data.get('score_equite', '?')}")

    return "\n".join(lines)


def _format_network(data: Dict) -> str:
    """Format network response."""
    lines = [
        f"**Reseau hydrique RSK**\n",
        f"Noeuds : {data.get('noeuds', 0)} | Connexions : {data.get('connexions', 0)}\n",
        f"**Types de noeuds** :",
    ]

    for t, count in data.get("types", {}).items():
        lines.append(f"  - {t} : {count}")

    barrages = data.get("barrages", [])
    if barrages:
        lines.append(f"\n**Barrages** ({len(barrages)}) :")
        for b in barrages:
            lines.append(f"  - {b['nom']} (bassin: {b['bassin']})")

    return "\n".join(lines)


def process_message(message: str, db: Session) -> str:
    """Main agent entry point: process a user message and return a response."""

    # Greetings
    greetings = ["bonjour", "salut", "hello", "hi", "hey", "bonsoir"]
    if any(g in message.lower() for g in greetings):
        return (
            "Bonjour ! Je suis l'agent **AquaRoute AI**. "
            "Je peux vous aider a analyser la situation hydrique de la region RSK.\n\n"
            "Voici ce que je peux faire :\n"
            "- Analyser les niveaux de barrages\n"
            "- Interpreter la meteo\n"
            "- Recommander des transferts\n"
            "- Evaluer les risques\n"
            "- Simuler des scenarios (secheresse, pluie forte, pic d'irrigation)\n\n"
            "Que souhaitez-vous savoir ?"
        )

    # Help
    if any(kw in message.lower() for kw in ["aide", "help", "quoi", "comment"]):
        return (
            "Je peux repondre a vos questions sur :\n\n"
            "1. **Barrages** — \"Quel est le niveau des barrages ?\"\n"
            "2. **Alertes** — \"Y a-t-il des risques ?\"\n"
            "3. **Meteo** — \"Quelle est la meteo prevue ?\"\n"
            "4. **Simulation** — \"Que se passe-t-il en cas de secheresse ?\"\n"
            "5. **Reseau** — \"Montre-moi le reseau hydrique\"\n"
        )

    # Detect intent and dispatch
    tool_name, params = detect_intent(message)

    # Get tool function
    tool_info = TOOLS.get(tool_name)
    if not tool_info:
        return "Je ne comprends pas votre demande. Pouvez-vous reformuler ?"

    # Execute tool
    tool_fn = tool_info["fn"]
    try:
        if tool_name == "simulation":
            result = tool_fn(db, **params)
        else:
            result = tool_fn(db)
    except Exception as e:
        return f"Erreur lors de l'execution : {str(e)}"

    # Format response
    response = format_response(tool_name, result)
    return response
