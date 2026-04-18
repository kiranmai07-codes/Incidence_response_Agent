from flask import Flask
from flask_cors import CORS
from config import Config
from models import db
from routes.incidents import incidents_bp
from routes.agent import agent_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)

    app.register_blueprint(incidents_bp, url_prefix="/api/incidents")
    app.register_blueprint(agent_bp, url_prefix="/api/agent")

    with app.app_context():
        db.create_all()

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port=5000)