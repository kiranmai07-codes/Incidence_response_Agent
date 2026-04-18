import smtplib
import json
import logging
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import current_app

logger = logging.getLogger(__name__)


# ─── Email ────────────────────────────────────────────────────────────────────

def send_email_alert(incident):
    """Send an email notification for a high/critical incident."""
    cfg = current_app.config
    smtp_user = cfg.get("SMTP_USER")
    smtp_password = cfg.get("SMTP_PASSWORD")
    recipients = [r.strip() for r in cfg.get("ALERT_RECIPIENTS", []) if r.strip()]

    if not smtp_user or not smtp_password or not recipients:
        logger.warning("Email alert skipped: SMTP credentials or recipients not configured.")
        return False

    subject = f"[{incident.severity.upper()}] Incident #{incident.id}: {incident.title}"

    body_html = f"""
    <html><body style="font-family: Arial, sans-serif; color: #333;">
      <h2 style="color: {'#d32f2f' if incident.severity == 'critical' else '#f57c00'};">
        🚨 Incident Alert — {incident.severity.upper()}
      </h2>
      <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>ID</b></td><td style="padding: 8px; border: 1px solid #ddd;">#{incident.id}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>Title</b></td><td style="padding: 8px; border: 1px solid #ddd;">{incident.title}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>Severity</b></td><td style="padding: 8px; border: 1px solid #ddd;">{incident.severity}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>Status</b></td><td style="padding: 8px; border: 1px solid #ddd;">{incident.status}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>Category</b></td><td style="padding: 8px; border: 1px solid #ddd;">{incident.category}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>Assigned To</b></td><td style="padding: 8px; border: 1px solid #ddd;">{incident.assigned_to or 'Unassigned'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>Reported By</b></td><td style="padding: 8px; border: 1px solid #ddd;">{incident.reported_by or 'Unknown'}</td></tr>
        <tr><td style="padding: 8px; border: 1px solid #ddd;"><b>Created At</b></td><td style="padding: 8px; border: 1px solid #ddd;">{incident.created_at}</td></tr>
      </table>
      <h3>Description</h3>
      <p>{incident.description}</p>
      {f'<h3>AI Summary</h3><p>{incident.ai_summary}</p>' if incident.ai_summary else ''}
    </body></html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = smtp_user
    msg["To"] = ", ".join(recipients)
    msg.attach(MIMEText(body_html, "html"))

    try:
        with smtplib.SMTP(cfg.get("SMTP_HOST", "smtp.gmail.com"),
                          cfg.get("SMTP_PORT", 587)) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.sendmail(smtp_user, recipients, msg.as_string())
        logger.info(f"Email alert sent for incident #{incident.id} to {recipients}")
        return True
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error sending alert for incident #{incident.id}: {e}")
        return False


# ─── Slack ────────────────────────────────────────────────────────────────────

SEVERITY_COLORS = {
    "critical": "#d32f2f",
    "high": "#f57c00",
    "medium": "#fbc02d",
    "low": "#388e3c",
}


def send_slack_alert(incident):
    """Post a Slack message via Incoming Webhook."""
    webhook_url = current_app.config.get("SLACK_WEBHOOK_URL")
    if not webhook_url:
        logger.warning("Slack alert skipped: SLACK_WEBHOOK_URL not configured.")
        return False

    color = SEVERITY_COLORS.get(incident.severity, "#9e9e9e")

    payload = {
        "text": f":rotating_light: *Incident Alert* — {incident.severity.upper()}",
        "attachments": [
            {
                "color": color,
                "fields": [
                    {"title": "ID", "value": f"#{incident.id}", "short": True},
                    {"title": "Severity", "value": incident.severity.capitalize(), "short": True},
                    {"title": "Status", "value": incident.status.capitalize(), "short": True},
                    {"title": "Category", "value": incident.category.capitalize(), "short": True},
                    {"title": "Title", "value": incident.title, "short": False},
                    {"title": "Description", "value": incident.description[:300] + ("..." if len(incident.description) > 300 else ""), "short": False},
                    {"title": "Assigned To", "value": incident.assigned_to or "Unassigned", "short": True},
                    {"title": "Reported By", "value": incident.reported_by or "Unknown", "short": True},
                ],
                "footer": "Incident Response Agent",
                "ts": int(incident.created_at.timestamp()) if incident.created_at else None
            }
        ]
    }

    try:
        resp = requests.post(webhook_url, json=payload, timeout=5)
        resp.raise_for_status()
        logger.info(f"Slack alert sent for incident #{incident.id}")
        return True
    except requests.RequestException as e:
        logger.error(f"Slack webhook error for incident #{incident.id}: {e}")
        return False


# ─── Unified send_alert ───────────────────────────────────────────────────────

def send_alert(incident):
    """Send all configured alerts for an incident. Returns a dict of results."""
    results = {}
    results["email"] = send_email_alert(incident)
    results["slack"] = send_slack_alert(incident)
    return results
