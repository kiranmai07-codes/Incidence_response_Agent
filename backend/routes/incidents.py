from flask import request, jsonify
from ..models import db
from ..models.incident import Incident
from . import incidents_bp

@incidents_bp.route('/', methods=['GET'])
def list_incidents():
    incidents = Incident.query.order_by(Incident.created_at.desc()).all()
    return jsonify({"incidents": [i.to_dict() for i in incidents]}), 200

@incidents_bp.route('/', methods=['POST'])
def create_incident():
    data = request.get_json()
    
    incident = Incident(
        title=data.get('title'),
        description=data.get('description', ''),
        severity=data.get('severity', 'medium'),
        category=data.get('category', 'other'),
        assigned_to=data.get('assigned_to'),
        reported_by=data.get('reported_by')
    )
    
    db.session.add(incident)
    db.session.commit()
    
    return jsonify(incident.to_dict()), 201

@incidents_bp.route('/<int:incident_id>', methods=['GET'])
def get_incident(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    return jsonify(incident.to_dict()), 200

@incidents_bp.route('/<int:incident_id>', methods=['PUT'])
def update_incident(incident_id):
    incident = Incident.query.get_or_404(incident_id)
    data = request.get_json()
    
    if 'status' in data:
        incident.status = data['status']
    if 'assigned_to' in data:
        incident.assigned_to = data['assigned_to']
    
    db.session.commit()
    return jsonify(incident.to_dict()), 200

@incidents_bp.route('/stats/summary', methods=['GET'])
def stats_summary():
    total = Incident.query.count()
    open_count = Incident.query.filter_by(status='open').count()
    resolved = Incident.query.filter_by(status='resolved').count()
    
    return jsonify({
        "total": total,
        "open": open_count,
        "resolved": resolved
    }), 200