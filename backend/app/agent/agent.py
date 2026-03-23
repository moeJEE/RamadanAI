"""AquaRoute AI Agent — Gemini LLM-powered with tool dispatch.

Uses Google Gemini to:
1. Understand user intent (natural language)
2. Decide which tool(s) to invoke
3. Generate fluent French responses from tool outputs

Falls back to keyword matching if Gemini is unavailable.
"""

import json
import re
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.agent.tools import TOOLS
from app.config import settings

# ── Gemini setup ──
_gemini_model = None
_HAS_GEMINI = False

try:
    import google.generativeai as genai
    _HAS_GEMINI = True
except ImportError:
    print("  [WARNING] google-generativeai not installed. Agent will use keyword fallback.")


SYSTEM_PROMPT = """Tu es l'agent intelligent **AquaRoute AI**, un assistant spécialisé dans la gestion prédictive de l'eau pour la région Rabat-Salé-Kénitra au Maroc.

## Ton rôle
- Analyser la situation hydrique des barrages de la région RSK
- Interpréter les prévisions météo et leur impact sur les ressources en eau
- Recommander des transferts inter-barrages optimisés
- Alerter sur les risques de crue ou de pénurie
- Simuler des scénarios what-if (sécheresse, pluie forte, pic d'irrigation)
- Sensibiliser aux enjeux de l'eau pendant le Ramadan (pics de consommation à l'iftar)

## Barrages de la région RSK
- Sidi Mohammed Ben Abdellah (SMBA) — principal barrage, capacité 974.8 Mm³
- Tamesna, El Mellah, El Himer, Maazer, Ain Kouachia, Zamrine

## Ton style
- Réponds TOUJOURS en français
- Sois professionnel mais accessible
- Utilise le format Markdown (gras, listes, emojis) pour structurer tes réponses
- Cite les données précises quand disponibles (taux de remplissage, volumes en Mm³)
- Quand tu donnes des recommandations, justifie-les avec des données
- Si le contexte du Ramadan est pertinent (gestion de l'eau pendant le jeûne), mentionne-le

## Outils disponibles
Tu as accès à 5 outils pour récupérer des données réelles :
1. **dam_status** — Obtenir les niveaux actuels des barrages
2. **alerts** — Vérifier les alertes actives (crue, stress hydrique)
3. **weather** — Consulter les prévisions météo 7 jours
4. **simulation** — Exécuter un scénario what-if
5. **network** — Voir le réseau hydrique (nœuds, connexions)

Choisis le bon outil selon la question de l'utilisateur. Tu peux combiner plusieurs outils.
"""


# ── Conversation memory ──
_conversation_history: List[Dict[str, str]] = []
MAX_HISTORY = 10


def _get_gemini_model():
    """Lazily initialize the Gemini model."""
    global _gemini_model
    if _gemini_model is None and _HAS_GEMINI and settings.GEMINI_API_KEY:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT,
        )
    return _gemini_model


def _call_tool(tool_name: str, db: Session, params: Dict = None) -> Dict:
    """Execute a tool and return its output."""
    tool_info = TOOLS.get(tool_name)
    if not tool_info:
        return {"error": f"Outil '{tool_name}' non trouvé"}

    tool_fn = tool_info["fn"]
    try:
        if tool_name == "simulation" and params:
            return tool_fn(db, **params)
        else:
            return tool_fn(db)
    except Exception as e:
        return {"error": str(e)}


def _detect_tool_from_llm_response(llm_text: str) -> Tuple[Optional[str], Dict]:
    """Parse the LLM's chosen tool from its response.

    The LLM is instructed to output a JSON block like:
    ```tool
    {"tool": "dam_status", "params": {}}
    ```
    """
    # Look for tool JSON block
    tool_match = re.search(r'```tool\s*\n?\s*(\{.*?\})\s*\n?\s*```', llm_text, re.DOTALL)
    if tool_match:
        try:
            tool_data = json.loads(tool_match.group(1))
            return tool_data.get("tool"), tool_data.get("params", {})
        except json.JSONDecodeError:
            pass

    # Also try inline JSON
    tool_match = re.search(r'\{"tool"\s*:\s*"(\w+)"', llm_text)
    if tool_match:
        return tool_match.group(1), {}

    return None, {}


def _process_with_gemini(message: str, db: Session) -> str:
    """Process a message using Gemini LLM."""
    global _conversation_history

    model = _get_gemini_model()
    if not model:
        return None  # Fall back to keyword matching

    # Step 1: Ask Gemini which tool to use
    tool_prompt = f"""L'utilisateur pose cette question : "{message}"

Quel outil dois-tu utiliser ? Réponds UNIQUEMENT avec un bloc JSON :

```tool
{{"tool": "nom_outil", "params": {{}}}}
```

Outils: dam_status, alerts, weather, simulation, network

Pour simulation, ajoute les params: 
- scenario: "drought" | "heavy_rain" | "irrigation_peak"
- precip_mult: float (ex: 0.2 pour sécheresse, 3.0 pour pluie forte)
- demand_mult: float (ex: 1.3 pour pic demande)

Si c'est un simple "bonjour" ou aide, utilise: {{"tool": "greeting", "params": {{}}}}
"""

    try:
        # Build conversation for context
        chat_history = []
        for msg in _conversation_history[-MAX_HISTORY:]:
            chat_history.append({"role": msg["role"], "parts": [msg["content"]]})

        chat = model.start_chat(history=chat_history)

        # Step 1: Get tool selection
        tool_response = chat.send_message(tool_prompt)
        tool_text = tool_response.text
        tool_name, params = _detect_tool_from_llm_response(tool_text)

        # Handle greetings without a tool call
        if tool_name == "greeting" or tool_name is None:
            final_response = chat.send_message(
                f"L'utilisateur dit : \"{message}\"\n\n"
                "Réponds directement de manière chaleureuse et professionnelle. "
                "Présente tes capacités si c'est un premier contact."
            )
            response_text = final_response.text

            # Save to history
            _conversation_history.append({"role": "user", "content": message})
            _conversation_history.append({"role": "model", "content": response_text})
            return response_text

        # Step 2: Call the tool
        tool_data = _call_tool(tool_name, db, params)

        # Step 3: Ask Gemini to format the response
        format_prompt = f"""L'utilisateur a demandé : "{message}"

J'ai utilisé l'outil **{tool_name}** et voici les données brutes :

```json
{json.dumps(tool_data, ensure_ascii=False, indent=2)[:3000]}
```

Maintenant, génère une réponse complète, structurée et utile en français.
- Utilise le Markdown (titres, gras, listes, emojis)
- Mets en avant les données critiques
- Ajoute des recommandations si pertinent
- Si des barrages sont en situation critique, signale-le clairement
- Sois concis mais informatif
"""

        final_response = chat.send_message(format_prompt)
        response_text = final_response.text

        # Save to history
        _conversation_history.append({"role": "user", "content": message})
        _conversation_history.append({"role": "model", "content": response_text})

        # Trim history
        if len(_conversation_history) > MAX_HISTORY * 2:
            _conversation_history = _conversation_history[-MAX_HISTORY * 2:]

        return response_text

    except Exception as e:
        print(f"  [Gemini Error] {e}")
        return None  # Fall back to keyword matching


# ══════════════════════════════════════════════════════
# KEYWORD FALLBACK (original logic kept as backup)
# ══════════════════════════════════════════════════════

def detect_intent(message: str) -> Tuple[str, Dict]:
    """Detect user intent via keyword matching (fallback)."""
    msg = message.lower().strip()

    if any(kw in msg for kw in ["sécheresse", "secheresse", "drought"]):
        return "simulation", {"scenario": "drought", "precip_mult": 0.2, "demand_mult": 1.3}
    if any(kw in msg for kw in ["pluie forte", "inondation", "crue", "heavy rain", "flood"]):
        return "simulation", {"scenario": "heavy_rain", "precip_mult": 3.0, "demand_mult": 1.0}
    if any(kw in msg for kw in ["irrigation", "pic", "ete", "été", "summer"]):
        return "simulation", {"scenario": "irrigation_peak", "precip_mult": 0.5, "demand_mult": 1.5}

    scores = {}
    for tool_name, tool_info in TOOLS.items():
        score = sum(1 for kw in tool_info["keywords"] if kw in msg)
        if score > 0:
            scores[tool_name] = score

    if scores:
        best_tool = max(scores, key=scores.get)
        return best_tool, {}

    return "dam_status", {}


def format_response(tool_name: str, data: Dict) -> str:
    """Format tool output into natural language (fallback)."""
    if "error" in data:
        return f"Désolé, une erreur est survenue : {data['error']}"

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
    resume = data.get("resume", {})
    lines = [
        f"📊 **Situation hydrique RSK**\n",
        f"🏗 Nombre de barrages : {resume.get('nombre', 0)}",
        f"💧 Réserve totale : {resume.get('reserve_totale_Mm3', '?')} Mm³ / {resume.get('capacite_totale_Mm3', '?')} Mm³",
        f"📈 Taux moyen de remplissage : {resume.get('taux_moyen', '?')}\n",
        "**Détail par barrage** :\n",
    ]
    for dam in data.get("barrages", []):
        status_emoji = {
            "critical": "🔴", "low": "🟠", "medium": "🟡",
            "good": "🟢", "full": "🔵", "overflow_risk": "🟣",
        }.get(dam["statut"], "⚪")
        lines.append(
            f"- {status_emoji} **{dam['nom']}** : {dam['taux_remplissage']} "
            f"({dam['reserve_Mm3']} / {dam['capacite_Mm3']} Mm³)"
        )
    return "\n".join(lines)


def _format_alerts(data: Dict) -> str:
    alertes = data.get("alertes", [])
    if not alertes:
        return "✅ Aucune alerte active. Situation nominale."
    lines = [
        f"⚠️ **{len(alertes)} alerte(s) active(s)** "
        f"({data.get('nombre_critiques', 0)} critique(s), "
        f"{data.get('nombre_avertissements', 0)} avertissement(s))\n",
    ]
    for a in alertes:
        emoji = "🔴" if a["severite"] == "CRITICAL" else "🟠"
        lines.append(f"{emoji} **{a['barrage']}** — {a['message']}")
        lines.append(f"  💡 {a['recommandation']}\n")
    return "\n".join(lines)


def _format_weather(data: Dict) -> str:
    previsions = data.get("previsions", {})
    if not previsions:
        return data.get("message", "Aucune prévision disponible.")
    lines = ["🌦 **Prévisions météo RSK** :\n"]
    for location, forecasts in previsions.items():
        lines.append(f"📍 **{location}** :")
        for f in forecasts[:3]:
            lines.append(
                f"  - {f['date']} : {f['precip_mm']} mm pluie, "
                f"{f.get('temp_min', '?')}–{f.get('temp_max', '?')}°C"
            )
        lines.append("")
    return "\n".join(lines)


def _format_simulation(data: Dict) -> str:
    lines = [
        f"🧪 **Simulation : {data.get('scenario', '?')}** (horizon {data.get('horizon', '?')})\n",
    ]
    for dam in data.get("barrages", []):
        risk = f" ⚠️ {dam['risque']}" if dam["risque"] != "aucun" else ""
        lines.append(
            f"- **{dam['nom']}** : {dam['actuel']} → {dam['projete']} ({dam['variation']}){risk}"
        )
    transfers = data.get("transferts_recommandes", [])
    if transfers:
        lines.append(f"\n🔄 **Transferts recommandés** ({len(transfers)}) :")
        for t in transfers:
            lines.append(f"  - {t['de']} → {t['vers']} : {t['volume_Mm3']} Mm³")
    lines.append(f"\n⚖️ Score d'équité : {data.get('score_equite', '?')}")
    return "\n".join(lines)


def _format_network(data: Dict) -> str:
    lines = [
        f"🌐 **Réseau hydrique RSK**\n",
        f"📍 Nœuds : {data.get('noeuds', 0)} | 🔗 Connexions : {data.get('connexions', 0)}\n",
    ]
    for t, count in data.get("types", {}).items():
        lines.append(f"  - {t} : {count}")
    barrages = data.get("barrages", [])
    if barrages:
        lines.append(f"\n🏗 **Barrages** ({len(barrages)}) :")
        for b in barrages:
            lines.append(f"  - {b['nom']} (bassin: {b['bassin']})")
    return "\n".join(lines)


# ══════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ══════════════════════════════════════════════════════

def process_message(message: str, db: Session) -> str:
    """Main agent entry point: process a user message and return a response.

    Tries Gemini LLM first, falls back to keyword matching if unavailable.
    """
    # Try Gemini first
    if _HAS_GEMINI and settings.GEMINI_API_KEY:
        gemini_response = _process_with_gemini(message, db)
        if gemini_response:
            return gemini_response

    # ── Fallback: keyword matching ──
    greetings = ["bonjour", "salut", "hello", "hi", "hey", "bonsoir"]
    if any(g in message.lower() for g in greetings):
        return (
            "👋 Bonjour ! Je suis l'agent **AquaRoute AI**.\n\n"
            "Je peux vous aider à analyser la situation hydrique de la région RSK :\n\n"
            "- 📊 Analyser les niveaux de barrages\n"
            "- 🌦 Interpréter la météo\n"
            "- 🔄 Recommander des transferts\n"
            "- ⚠️ Évaluer les risques\n"
            "- 🧪 Simuler des scénarios (sécheresse, pluie forte, Ramadan)\n\n"
            "Que souhaitez-vous savoir ?"
        )

    if any(kw in message.lower() for kw in ["aide", "help", "quoi", "comment"]):
        return (
            "Je peux répondre à vos questions sur :\n\n"
            "1. 📊 **Barrages** — \"Quel est le niveau des barrages ?\"\n"
            "2. ⚠️ **Alertes** — \"Y a-t-il des risques ?\"\n"
            "3. 🌦 **Météo** — \"Quelle est la météo prévue ?\"\n"
            "4. 🧪 **Simulation** — \"Que se passe-t-il en cas de sécheresse ?\"\n"
            "5. 🌐 **Réseau** — \"Montre-moi le réseau hydrique\"\n"
        )

    # Detect intent and dispatch
    tool_name, params = detect_intent(message)
    tool_info = TOOLS.get(tool_name)
    if not tool_info:
        return "Je ne comprends pas votre demande. Pouvez-vous reformuler ?"

    tool_fn = tool_info["fn"]
    try:
        if tool_name == "simulation":
            result = tool_fn(db, **params)
        else:
            result = tool_fn(db)
    except Exception as e:
        return f"Erreur lors de l'exécution : {str(e)}"

    return format_response(tool_name, result)
