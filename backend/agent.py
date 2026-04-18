from flask import Blueprint, request, jsonify, current_app
from models import db
from models.incident import Incident
import anthropic
import json

agent_bp = Blueprint("agent", __name__)


# ─── Prompt Builder ───────────────────────────────────────────────────────────

def build_analysis_prompt(incident: Incident) -> str:
    return f"""You are an expert incident response analyst. Analyze the following IT incident and provide a structured response.

INCIDENT DETAILS:
- ID: {incident.id}
- Title: {incident.title}
- Description: {incident.description}
- Severity: {incident.severity}
- Status: {incident.status}
- Category: {incident.category}
- Assigned To: {incident.assigned_to or 'Unassigned'}
- Reported By: {incident.reported_by or 'Unknown'}
- Created At: {incident.created_at}

Respond ONLY with a valid JSON object (no markdown, no backticks) with these exact keys:
{{
  "summary": "A concise 2-3 sentence executive summary of the incident",
  "root_cause": "Your analysis of the likely root cause based on available info",
  "recommendations": ["Step 1 action item", "Step 2 action item", "Step 3 action item"],
  "priority_score": <integer 1-100 where 100 is most critical>,
  "estimated_resolution_time": "e.g. 2-4 hours",
  "escalation_needed": <true or false>
}}"""


def build_chat_prompt(incident: Incident, user_message: str, history: list) -> list:
    system = f"""You are an AI incident response assistant helping with incident #{incident.id}: "{incident.title}".

Incident context:
- Description: {incident.description}
- Severity: {incident.severity} | Status: {incident.status} | Category: {incident.category}
- AI Summary: {incident.ai_summary or 'Not yet analyzed'}
- Root Cause: {incident.ai_root_cause or 'Unknown'}

Answer questions, suggest troubleshooting steps, and provide clear technical guidance.
Be concise, actionable, and professional."""

    messages = []
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_message})

    return system, messages


# ─── Routes ───────────────────────────────────────────────────────────────────

@agent_bp.route("/analyze/<int:incident_id>", methods=["POST"])
def analyze_incident(incident_id):
    """POST /api/agent/analyze/<id> — run AI analysis on an incident."""
    incident = Incident.query.get_or_404(incident_id)
    api_key = current_app.config.get("ANTHROPIC_API_KEY")

    if not api_key:
        return jsonify({"error": "ANTHROPIC_API_KEY is not configured"}), 500

    try:
        client = anthropic.Anthropic(api_key=api_key)
        prompt = build_analysis_prompt(incident)

        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )

        raw = message.content[0].text.strip()

        # Strip accidental markdown fences
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip().strip("```").strip()

        result = json.loads(raw)

        # Persist AI results onto incident
        incident.ai_summary = result.get("summary", "")
        incident.ai_root_cause = result.get("root_cause", "")
        incident.set_recommendations(result.get("recommendations", []))
        incident.ai_priority_score = result.get("priority_score")
        incident.append_audit("AI analysis completed", actor="ai-agent")

        db.session.commit()

        return jsonify({
            "incident_id": incident.id,
            "analysis": result,
            "incident": incident.to_dict()
        }), 200

    except json.JSONDecodeError as e:
        current_app.logger.error(f"AI response was not valid JSON: {e}")
        return jsonify({"error": "AI returned an unexpected format", "detail": str(e)}), 502
    except anthropic.APIError as e:
        current_app.logger.error(f"Anthropic API error: {e}")
        return jsonify({"error": "AI service error", "detail": str(e)}), 502
    except Exception as e:
        current_app.logger.exception(f"Unexpected error during analysis: {e}")
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500


@agent_bp.route("/chat/<int:incident_id>", methods=["POST"])
def chat_with_agent(incident_id):
    """POST /api/agent/chat/<id> — conversational AI assistant for an incident."""
    incident = Incident.query.get_or_404(incident_id)
    data = request.get_json(silent=True)

    if not data or not data.get("message"):
        return jsonify({"error": "message field is required"}), 400

    api_key = current_app.config.get("ANTHROPIC_API_KEY")
    if not api_key:
        return jsonify({"error": "ANTHROPIC_API_KEY is not configured"}), 500

    history = data.get("history", [])  # [{role, content}, ...]
    user_message = data["message"]

    try:
        client = anthropic.Anthropic(api_key=api_key)
        system, messages = build_chat_prompt(incident, user_message, history)

        response = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1024,
            system=system,
            messages=messages
        )

        reply = response.content[0].text.strip()

        return jsonify({
            "incident_id": incident.id,
            "reply": reply,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens
            }
        }), 200

    except anthropic.APIError as e:
        return jsonify({"error": "AI service error", "detail": str(e)}), 502
    except Exception as e:
        current_app.logger.exception(f"Chat error: {e}")
        return jsonify({"error": "Internal server error", "detail": str(e)}), 500


@agent_bp.route("/suggest-assignee/<int:incident_id>", methods=["GET"])
def suggest_assignee(incident_id):
    """GET /api/agent/suggest-assignee/<id> — suggest the best team/person for this incident."""
    incident = Incident.query.get_or_404(incident_id)
    api_key = current_app.config.get("ANTHROPIC_API_KEY")

    if not api_key:
        return jsonify({"error": "ANTHROPIC_API_KEY is not configured"}), 500

    prompt = f"""Given this incident, suggest the most appropriate team or role to handle it.

Incident: {incident.title}
Description: {incident.description}
Category: {incident.category}
Severity: {incident.severity}

Respond ONLY with JSON (no markdown):
{{
  "suggested_team": "e.g. Security Operations Center",
  "suggested_role": "e.g. Senior Security Engineer",
  "reasoning": "Brief explanation"
}}"""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = message.content[0].text.strip().strip("```json").strip("```").strip()
        result = json.loads(raw)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
