from flask import request, jsonify
from . import agent_bp
from ..models.incident import Incident

@agent_bp.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message', '').lower()
    incident_id = data.get('incident_id')
    
    response = "👋 Hello! I'm your IRA AI Agent. How can I help you?"
    
    if 'critical' in message:
        response = "🚨 Critical incidents require immediate attention. Check your dashboard for details."
    elif 'help' in message:
        response = "📚 Available commands:\n• critical - Show critical incidents\n• help - Show this help"
    else:
        response = f"You asked: {message}\n\nTry asking for 'help' to see available commands."
    
    return jsonify({"response": response}), 200