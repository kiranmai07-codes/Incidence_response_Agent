from models import db
from datetime import datetime, timezone
import json


class Incident(db.Model):
    __tablename__ = "incidents"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)

    # Severity: critical | high | medium | low
    severity = db.Column(db.String(20), nullable=False, default="medium")

    # Status: open | investigating | resolved | closed
    status = db.Column(db.String(30), nullable=False, default="open")

    # Category: network | security | application | database | infrastructure | other
    category = db.Column(db.String(50), nullable=False, default="other")

    assigned_to = db.Column(db.String(120), nullable=True)
    reported_by = db.Column(db.String(120), nullable=True)

    # AI-generated fields
    ai_summary = db.Column(db.Text, nullable=True)
    ai_recommendations = db.Column(db.Text, nullable=True)   # JSON list stored as string
    ai_root_cause = db.Column(db.Text, nullable=True)
    ai_priority_score = db.Column(db.Integer, nullable=True)  # 1-100

    # Timeline
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime,
                           default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Audit log stored as JSON string
    audit_log = db.Column(db.Text, default="[]")

    def get_recommendations(self):
        try:
            return json.loads(self.ai_recommendations) if self.ai_recommendations else []
        except (json.JSONDecodeError, TypeError):
            return []

    def set_recommendations(self, rec_list):
        self.ai_recommendations = json.dumps(rec_list)

    def get_audit_log(self):
        try:
            return json.loads(self.audit_log) if self.audit_log else []
        except (json.JSONDecodeError, TypeError):
            return []

    def append_audit(self, action: str, actor: str = "system"):
        log = self.get_audit_log()
        log.append({
            "action": action,
            "actor": actor,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        self.audit_log = json.dumps(log)

    def to_dict(self, full=False):
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "status": self.status,
            "category": self.category,
            "assigned_to": self.assigned_to,
            "reported_by": self.reported_by,
            "ai_summary": self.ai_summary,
            "ai_recommendations": self.get_recommendations(),
            "ai_root_cause": self.ai_root_cause,
            "ai_priority_score": self.ai_priority_score,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
        }
        if full:
            data["audit_log"] = self.get_audit_log()
        return data

    def __repr__(self):
        return f"<Incident {self.id}: {self.title} [{self.severity}/{self.status}]>"
