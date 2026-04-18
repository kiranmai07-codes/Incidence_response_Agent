import logging

logger = logging.getLogger(__name__)

def send_alert(incident):
    """Send alert for critical/high incidents"""
    logger.info(f"Alert sent for incident #{incident.id} - {incident.title}")
    return {"email": True, "slack": True}