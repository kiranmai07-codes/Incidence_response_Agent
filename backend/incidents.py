from flask import Blueprint, request, jsonify, current_app
from models import db
from models.incident import Incident
from utils.notifier import send_alert
from datetime import datetime, timezone

incidents_bp = Blueprint("incidents", __name__)


# ─── Helper ──────────────────────────────────────────────────────────────────

def paginate_query(query):
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get(
        "per_page",
        current_app.config.get("INCIDENTS_PER_PAGE", 20),
        type=int
    )
    paginated = query.paginate(page=page, per_page=per_page, error_out=False)
    return paginated


# ─── LIST / CREATE ────────────────────────────────────────────────────────────

@incidents_bp.route("/", methods=["GET"])
def list_incidents():
    """GET /api/incidents/ — list incidents with optional filters & pagination."""
    query = Incident.query

    # Filters
    status = request.args.get("status")
    severity = request.args.get("severity")
    category = request.args.get("category")
    assigned_to = request.args.get("assigned_to")
    search = request.args.get("search")

    if status:
        query = query.filter(Incident.status == status)
    if severity:
        query = query.filter(Incident.severity == severity)
    if category:
        query = query.filter(Incident.category == category)
    if assigned_to:
        query = query.filter(Incident.assigned_to == assigned_to)
    if search:
        like = f"%{search}%"
        query = query.filter(
            (Incident.title.ilike(like)) | (Incident.description.ilike(like))
        )

    # Sort
    sort_by = request.args.get("sort_by", "created_at")
    order = request.args.get("order", "desc")
    col = getattr(Incident, sort_by, Incident.created_at)
    query = query.order_by(col.desc() if order == "desc" else col.asc())

    paginated = paginate_query(query)

    return jsonify({
        "incidents": [i.to_dict() for i in paginated.items],
        "total": paginated.total,
        "page": paginated.page,
        "pages": paginated.pages,
        "per_page": paginated.per_page
    }), 200


@incidents_bp.route("/", methods=["POST"])
def create_incident():
    """POST /api/incidents/ — create a new incident."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    required = ["title", "description"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 422

    valid_severities = {"critical", "high", "medium", "low"}
    valid_statuses = {"open", "investigating", "resolved", "closed"}
    valid_categories = {"network", "security", "application", "database", "infrastructure", "other"}

    severity = data.get("severity", "medium")
    status = data.get("status", "open")
    category = data.get("category", "other")

    if severity not in valid_severities:
        return jsonify({"error": f"Invalid severity. Choose from: {valid_severities}"}), 422
    if status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Choose from: {valid_statuses}"}), 422
    if category not in valid_categories:
        return jsonify({"error": f"Invalid category. Choose from: {valid_categories}"}), 422

    incident = Incident(
        title=data["title"],
        description=data["description"],
        severity=severity,
        status=status,
        category=category,
        assigned_to=data.get("assigned_to"),
        reported_by=data.get("reported_by"),
    )
    incident.append_audit("Incident created", actor=data.get("reported_by", "system"))

    db.session.add(incident)
    db.session.commit()

    # Fire alert for critical / high severity
    if incident.severity in ("critical", "high"):
        try:
            send_alert(incident)
        except Exception as exc:
            current_app.logger.warning(f"Alert failed for incident {incident.id}: {exc}")

    return jsonify(incident.to_dict()), 201


# ─── GET / UPDATE / DELETE ────────────────────────────────────────────────────

@incidents_bp.route("/<int:incident_id>", methods=["GET"])
def get_incident(incident_id):
    """GET /api/incidents/<id> — fetch one incident (with audit log)."""
    incident = Incident.query.get_or_404(incident_id)
    return jsonify(incident.to_dict(full=True)), 200


@incidents_bp.route("/<int:incident_id>", methods=["PUT"])
def update_incident(incident_id):
    """PUT /api/incidents/<id> — update an incident."""
    incident = Incident.query.get_or_404(incident_id)
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON body"}), 400

    updatable = ["title", "description", "severity", "status", "category", "assigned_to", "reported_by"]
    changed = []

    for field in updatable:
        if field in data:
            old = getattr(incident, field)
            new = data[field]
            if old != new:
                setattr(incident, field, new)
                changed.append(f"{field}: {old!r} → {new!r}")

    if "status" in data and data["status"] == "resolved" and not incident.resolved_at:
        incident.resolved_at = datetime.now(timezone.utc)

    if changed:
        incident.append_audit(
            f"Updated: {'; '.join(changed)}",
            actor=data.get("updated_by", "system")
        )

    incident.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(incident.to_dict(full=True)), 200


@incidents_bp.route("/<int:incident_id>", methods=["DELETE"])
def delete_incident(incident_id):
    """DELETE /api/incidents/<id> — delete an incident."""
    incident = Incident.query.get_or_404(incident_id)
    db.session.delete(incident)
    db.session.commit()
    return jsonify({"message": f"Incident {incident_id} deleted successfully"}), 200


# ─── STATS ────────────────────────────────────────────────────────────────────

@incidents_bp.route("/stats/summary", methods=["GET"])
def stats_summary():
    """GET /api/incidents/stats/summary — dashboard counts."""
    total = Incident.query.count()
    by_status = {
        s: Incident.query.filter_by(status=s).count()
        for s in ["open", "investigating", "resolved", "closed"]
    }
    by_severity = {
        s: Incident.query.filter_by(severity=s).count()
        for s in ["critical", "high", "medium", "low"]
    }
    by_category = {}
    for row in db.session.execute(
        db.select(Incident.category, db.func.count(Incident.id))
        .group_by(Incident.category)
    ):
        by_category[row[0]] = row[1]

    return jsonify({
        "total": total,
        "by_status": by_status,
        "by_severity": by_severity,
        "by_category": by_category
    }), 200
