from flask import Blueprint

incidents_bp = Blueprint('incidents', __name__, url_prefix='/api')
agent_bp = Blueprint('agent', __name__, url_prefix='/api')

from . import incidents
from . import agent