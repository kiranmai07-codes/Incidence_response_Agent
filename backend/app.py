from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
import os

# Point Flask to your frontend folder
# Adjust the path if your folder structure is different
app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# ─── Serve Frontend ───────────────────────────────────────────
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/incidents')
def serve_incidents():
    return send_from_directory(app.static_folder, 'incidents.html')

@app.route('/agent')
def serve_agent():
    return send_from_directory(app.static_folder, 'agent.html')

@app.route('/analytics')
def serve_analytics():
    return send_from_directory(app.static_folder, 'analytics.html')

# Serve any static file (css, js, images)
@app.route('/<path:path>')
def serve_static(path):
    full_path = os.path.join(app.static_folder, path)
    if os.path.exists(full_path):
        return send_from_directory(app.static_folder, path)
    # fallback to index
    return send_from_directory(app.static_folder, 'index.html')

# ─── Sample Data ──────────────────────────────────────────────
incidents = [
    {
        "id": "INC-001",
        "title": "Database connection timeout",
        "severity": "critical",
        "status": "open",
        "category": "database",
        "assignee": "DevOps Team",
        "description": "Production database connection pool exhausted causing API failures. Error rate spiked to 45%.",
        "created_at": datetime.now().isoformat(),
        "time_ago": "2 hours ago"
    },
    {
        "id": "INC-002",
        "title": "API latency spike in payment service",
        "severity": "high",
        "status": "in-progress",
        "category": "application",
        "assignee": "Alice Chen",
        "description": "API response times increased from 200ms to 4500ms affecting checkout flow.",
        "created_at": datetime.now().isoformat(),
        "time_ago": "5 hours ago"
    },
    {
        "id": "INC-003",
        "title": "SSL certificate expiring in 3 days",
        "severity": "medium",
        "status": "open",
        "category": "security",
        "assignee": "Bob Sharma",
        "description": "SSL cert for api.example.com expires Friday. Auto-renewal failed.",
        "created_at": datetime.now().isoformat(),
        "time_ago": "1 day ago"
    },
    {
        "id": "INC-004",
        "title": "Disk usage at 87% on logs server",
        "severity": "medium",
        "status": "in-progress",
        "category": "infrastructure",
        "assignee": "Carol Singh",
        "description": "Log aggregation server disk usage critical. Rotation misconfigured.",
        "created_at": datetime.now().isoformat(),
        "time_ago": "3 hours ago"
    },
    {
        "id": "INC-005",
        "title": "Failed login attempts from suspicious IPs",
        "severity": "high",
        "status": "open",
        "category": "security",
        "assignee": "Security Team",
        "description": "150 failed login attempts from 5 IP ranges in last 30 min. Possible brute force.",
        "created_at": datetime.now().isoformat(),
        "time_ago": "45 minutes ago"
    },
    {
        "id": "INC-006",
        "title": "Frontend build pipeline broken",
        "severity": "low",
        "status": "resolved",
        "category": "application",
        "assignee": "Emma Patel",
        "description": "CI/CD pipeline failed due to deprecated Node.js version. Upgraded to v20 LTS.",
        "created_at": datetime.now().isoformat(),
        "time_ago": "2 days ago"
    }
]

# ─── API Routes ───────────────────────────────────────────────
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "message": "IRA Backend is running!",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/incidents', methods=['GET'])
def get_incidents():
    return jsonify({
        "success": True,
        "count": len(incidents),
        "incidents": incidents
    })

@app.route('/api/incidents', methods=['POST'])
def create_incident():
    data = request.get_json()
    if not data or not data.get('title'):
        return jsonify({"success": False, "error": "Title is required"}), 400

    new_id = f"INC-{str(len(incidents) + 1).zfill(3)}"
    new_incident = {
        "id": new_id,
        "title": data.get('title'),
        "severity": data.get('severity', 'medium'),
        "status": "open",
        "category": data.get('category', 'infrastructure'),
        "assignee": data.get('assignee', 'Unassigned'),
        "description": data.get('description', ''),
        "created_at": datetime.now().isoformat(),
        "time_ago": "Just now"
    }
    incidents.insert(0, new_incident)
    return jsonify({"success": True, "incident": new_incident}), 201

@app.route('/api/incidents/<inc_id>', methods=['PUT'])
def update_incident(inc_id):
    data = request.get_json()
    for inc in incidents:
        if inc['id'] == inc_id:
            inc.update({k: v for k, v in data.items() if k != 'id'})
            return jsonify({"success": True, "incident": inc})
    return jsonify({"success": False, "error": "Incident not found"}), 404

@app.route('/api/incidents/<inc_id>', methods=['DELETE'])
def delete_incident(inc_id):
    global incidents
    before = len(incidents)
    incidents = [i for i in incidents if i['id'] != inc_id]
    if len(incidents) < before:
        return jsonify({"success": True, "message": f"{inc_id} deleted"})
    return jsonify({"success": False, "error": "Incident not found"}), 404

@app.route('/api/stats', methods=['GET'])
def get_stats():
    return jsonify({
        "total": len(incidents),
        "critical": len([i for i in incidents if i['severity'] == 'critical' and i['status'] != 'resolved']),
        "high":     len([i for i in incidents if i['severity'] == 'high'     and i['status'] != 'resolved']),
        "medium":   len([i for i in incidents if i['severity'] == 'medium'   and i['status'] != 'resolved']),
        "resolved": len([i for i in incidents if i['status'] == 'resolved']),
        "open":     len([i for i in incidents if i['status'] == 'open']),
        "in_progress": len([i for i in incidents if i['status'] == 'in-progress'])
    })

@app.route('/api/charts', methods=['GET'])
def get_charts():
    return jsonify({
        "activity": {
            "labels": ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            "data": [4, 7, 3, 8, 5, 2, 3]
        },
        "severity": {
            "critical": len([i for i in incidents if i['severity'] == 'critical']),
            "high":     len([i for i in incidents if i['severity'] == 'high']),
            "medium":   len([i for i in incidents if i['severity'] == 'medium']),
            "low":      len([i for i in incidents if i['severity'] == 'low'])
        }
    })

@app.route('/api/agent/analyze', methods=['POST'])
def analyze_incident():
    data = request.get_json()
    incident_id  = data.get('id', 'Unknown')
    category     = data.get('category', 'general')
    title        = data.get('title', '')

    responses = {
        "database":       f"🔍 Root Cause: Connection pool exhaustion detected.\n\n🛠 Steps:\n1. Run SHOW PROCESSLIST;\n2. Increase max_connections\n3. Restart PgBouncer\n4. Monitor pg_stat_activity",
        "security":       f"🔒 Threat: Brute-force / credential stuffing attack.\n\n🛠 Steps:\n1. Block IPs in WAF\n2. Enable rate limiting (5 req/min)\n3. Force MFA for all admins\n4. Rotate compromised credentials",
        "infrastructure": f"🏗 Issue: Disk/resource exhaustion.\n\n🛠 Steps:\n1. Run: du -sh /var/log/*\n2. Clear old logs: journalctl --vacuum-time=7d\n3. Set logrotate policy\n4. Add 75% disk alert",
        "application":    f"💻 Issue: Memory leak / resource mismanagement.\n\n🛠 Steps:\n1. Capture heap dump\n2. Review recent deployments\n3. Set memory limit and auto-restart\n4. Add Grafana memory alert",
        "network":        f"🌐 Issue: Network degradation or routing problem.\n\n🛠 Steps:\n1. Run mtr --report api.example.com\n2. Check CDN dashboard\n3. Failover to backup region\n4. Contact upstream ISP if needed",
    }

    analysis = responses.get(category, f"🤖 Analysis for {incident_id}:\n\n🛠 Steps:\n1. Check deploy logs (last 2h)\n2. Review system metrics\n3. Roll back if deployment correlated\n4. Escalate if unresolved in 15 min")

    return jsonify({
        "success": True,
        "incident_id": incident_id,
        "analysis": analysis,
        "analyzed_at": datetime.now().isoformat()
    })

# ─── Start ────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 50)
    print("🚀 IRA BACKEND STARTING...")
    print("=" * 50)
    print()
    print("🌐 Open your website: http://localhost:5000")
    print()
    print("📋 API endpoints:")
    print("   http://localhost:5000/api/health")
    print("   http://localhost:5000/api/incidents")
    print("   http://localhost:5000/api/stats")
    print()
    print("=" * 50)
    print("✅ Backend is ready!")
    print("=" * 50)

    app.run(debug=True, host='0.0.0.0', port=5000)