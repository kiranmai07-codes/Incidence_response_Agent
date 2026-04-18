from datetime import datetime, timezone
import json
from ..models import db

class Incident(db.Model):
    __tablename__ = "incidents"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), nullable=False, default="medium")
    status = db.Column(db.String(30), nullable=False, default="open")
    category = db.Column(db.String(50), nullable=False, default="other")
    assigned_to = db.Column(db.String(120), nullable=True)
    reported_by = db.Column(db.String(120), nullable=True)
    
    # AI fields
    ai_summary = db.Column(db.Text, nullable=True)
    ai_recommendations = db.Column(db.Text, nullable=True)
    ai_root_cause = db.Column(db.Text, nullable=True)
    ai_priority_score = db.Column(db.Integer, nullable=True)
    
    # Timeline
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    resolved_at = db.Column(db.DateTime, nullable=True)
    
    audit_log = db.Column(db.Text, default="[]")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "status": self.status,
            "category": self.category,
            "assigned_to": self.assigned_to,
            "reported_by": self.reported_by,
            "ai_summary": self.ai_summary,
            "ai_root_cause": self.ai_root_cause,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }