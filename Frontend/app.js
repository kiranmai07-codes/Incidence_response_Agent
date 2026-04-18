/* =============================================
   IRA — app.js  (Shared Core Logic)
   Works without backend using localStorage
   Replace API_BASE calls when Flask is ready
   ============================================= */

const API_BASE = 'http://localhost:5000/api';
const USE_MOCK = true; // Set false when Flask backend is running

/* ── Local Storage Keys ── */
const KEYS = {
  incidents: 'ira_incidents',
  aiLog: 'ira_ai_log',
  aiCount: 'ira_ai_count',
};

/* ── Seed mock data on first load ── */
function seedMockData() {
  if (localStorage.getItem(KEYS.incidents)) return;
  const mock = [
    { id: 'INC-001', title: 'Database connection timeout on prod-db-01', severity: 'critical', status: 'open', category: 'database', description: 'Production database is experiencing intermittent connection timeouts causing API failures. Error rate spiked to 45%.', assignee: 'DevOps Team', createdAt: Date.now() - 3600000, aiAnalyzed: true },
    { id: 'INC-002', title: 'Memory leak in payment microservice', severity: 'high', status: 'in-progress', category: 'application', description: 'Payment service memory usage growing unboundedly, restarted 3 times in last hour.', assignee: 'Alice Chen', createdAt: Date.now() - 7200000, aiAnalyzed: true },
    { id: 'INC-003', title: 'SSL certificate expiring in 3 days', severity: 'high', status: 'open', category: 'security', description: 'SSL cert for api.example.com expiring on Friday. Auto-renewal failed.', assignee: 'Bob Sharma', createdAt: Date.now() - 10800000, aiAnalyzed: false },
    { id: 'INC-004', title: 'Disk usage at 87% on logs server', severity: 'medium', status: 'in-progress', category: 'infrastructure', description: 'Log aggregation server disk usage critical. Old logs accumulating due to rotation misconfiguration.', assignee: 'Carol Singh', createdAt: Date.now() - 14400000, aiAnalyzed: true },
    { id: 'INC-005', title: 'CDN latency spike in Asia-Pacific region', severity: 'medium', status: 'open', category: 'network', description: 'Users in APAC experiencing 3x normal latency. CDN edge nodes potentially overloaded.', assignee: 'Network Team', createdAt: Date.now() - 18000000, aiAnalyzed: false },
    { id: 'INC-006', title: 'Failed login attempts from suspicious IPs', severity: 'high', status: 'open', category: 'security', description: '150 failed login attempts from 5 IP ranges in last 30 min. Possible brute force attack.', assignee: 'Security Team', createdAt: Date.now() - 21600000, aiAnalyzed: true },
    { id: 'INC-007', title: 'API gateway returning 504 errors', severity: 'critical', status: 'open', category: 'network', description: 'Gateway timeout errors affecting 23% of requests to user-service. Health checks failing.', assignee: 'Platform Team', createdAt: Date.now() - 900000, aiAnalyzed: false },
    { id: 'INC-008', title: 'Scheduled backup job failed silently', severity: 'medium', status: 'resolved', category: 'infrastructure', description: 'Nightly backup job completed with exit code 0 but produced empty archive. Issue in compression script.', assignee: 'David Kumar', createdAt: Date.now() - 86400000, aiAnalyzed: true },
    { id: 'INC-009', title: 'Frontend build pipeline broken', severity: 'low', status: 'resolved', category: 'application', description: 'CI/CD pipeline failed due to deprecated Node.js version. Upgraded to v20 LTS.', assignee: 'Emma Patel', createdAt: Date.now() - 172800000, aiAnalyzed: false },
    { id: 'INC-010', title: 'Redis cache hit rate dropped to 12%', severity: 'medium', status: 'open', category: 'database', description: 'Cache invalidation bug causing excessive DB load. Redis memory limit too low for current traffic.', assignee: 'Frank Liu', createdAt: Date.now() - 5400000, aiAnalyzed: true },
  ];
  localStorage.setItem(KEYS.incidents, JSON.stringify(mock));
}

/* ── CRUD Operations ── */
function getIncidents() {
  seedMockData();
  return JSON.parse(localStorage.getItem(KEYS.incidents) || '[]');
}

function saveIncidents(incidents) {
  localStorage.setItem(KEYS.incidents, JSON.stringify(incidents));
}

function getIncidentById(id) {
  return getIncidents().find(i => i.id === id);
}

function addIncident(data) {
  const incidents = getIncidents();
  const id = 'INC-' + String(incidents.length + 1).padStart(3, '0');
  const incident = {
    id,
    title: data.title,
    severity: data.severity,
    status: 'open',
    category: data.category,
    description: data.description || 'No description provided.',
    assignee: data.assignee || 'Unassigned',
    createdAt: Date.now(),
    aiAnalyzed: false,
  };
  incidents.unshift(incident);
  saveIncidents(incidents);
  return incident;
}

function updateIncident(id, updates) {
  const incidents = getIncidents();
  const idx = incidents.findIndex(i => i.id === id);
  if (idx !== -1) {
    incidents[idx] = { ...incidents[idx], ...updates };
    saveIncidents(incidents);
    return incidents[idx];
  }
  return null;
}

function deleteIncidentById(id) {
  const incidents = getIncidents().filter(i => i.id !== id);
  saveIncidents(incidents);
}

/* ── Stats Helpers ── */
function getStats() {
  const all = getIncidents();
  return {
    critical: all.filter(i => i.severity === 'critical' && i.status !== 'resolved').length,
    high: all.filter(i => i.severity === 'high' && i.status !== 'resolved').length,
    medium: all.filter(i => i.severity === 'medium' && i.status !== 'resolved').length,
    resolved: all.filter(i => i.status === 'resolved').length,
    open: all.filter(i => i.status === 'open').length,
    inProgress: all.filter(i => i.status === 'in-progress').length,
    total: all.length,
  };
}

/* ── AI Responses ── */
const AI_RESPONSES = {
  database: {
    prefix: '🔍 **Root Cause Analysis:**\n',
    body: 'This appears to be a database connectivity issue. Common causes:\n• Connection pool exhaustion\n• Network partition between app and DB layers\n• DB server resource saturation (CPU/Memory)\n\n🛠️ **Recommended Remediation Steps:**\n1. Check connection pool settings (`max_connections` in DB config)\n2. Run `SHOW PROCESSLIST;` to identify blocking queries\n3. Restart connection pooler (PgBouncer/ProxySQL)\n4. Increase `max_connections` if needed\n5. Monitor with `pg_stat_activity` going forward\n\n⚡ **Priority:** Escalate immediately if error rate > 20%'
  },
  security: {
    prefix: '🔒 **Security Threat Analysis:**\n',
    body: 'Potential security incident detected. Immediate action required:\n• Pattern matches known brute-force / credential-stuffing attack\n• Source IPs may be part of a botnet\n\n🛠️ **Remediation Steps:**\n1. Block offending IP ranges in WAF/firewall\n2. Enable rate limiting on authentication endpoints (max 5 req/min)\n3. Enable MFA for all privileged accounts\n4. Rotate potentially compromised credentials\n5. Review auth logs for successful logins from flagged IPs\n6. File security incident report\n\n⚠️ **Severity:** HIGH - Immediate response required'
  },
  infrastructure: {
    prefix: '🏗️ **Infrastructure Analysis:**\n',
    body: 'System resource issue identified. This can cascade to service degradation:\n• Resource exhaustion is approaching critical threshold\n• Automated alerts may not have triggered correctly\n\n🛠️ **Remediation Steps:**\n1. Identify top consumers with `du -sh /*` or `df -h`\n2. Clear old logs: `journalctl --vacuum-time=7d`\n3. Set up log rotation policy (`/etc/logrotate.d/`)\n4. Add disk usage alert at 75% threshold\n5. Consider scaling storage or archiving cold data to S3\n\n✅ **Prevention:** Implement automated cleanup scripts via cron'
  },
  application: {
    prefix: '💻 **Application Analysis:**\n',
    body: 'Application-level fault detected. Service health is degraded:\n• Likely a code-level memory management issue\n• Could be caused by unbounded caches, event listeners, or async leaks\n\n🛠️ **Remediation Steps:**\n1. Capture heap dump: `kill -USR2 <pid>` or use clinic.js\n2. Review recent code changes in memory-intensive modules\n3. Set NODE_OPTIONS="--max-old-space-size=2048" as a temporary fix\n4. Deploy a pod restart policy via Kubernetes liveness probe\n5. Add memory metrics to Grafana dashboard\n\n🔁 **Mitigation:** Auto-restart service if memory > 80%'
  },
  network: {
    prefix: '🌐 **Network Analysis:**\n',
    body: 'Network-layer degradation detected. User experience is impacted:\n• Likely caused by routing issues, DDoS, or upstream provider problems\n• Check if issue is regional or global\n\n🛠️ **Remediation Steps:**\n1. Run `traceroute` / `mtr` to identify packet loss points\n2. Check CDN origin health in CloudFlare/Fastly dashboard\n3. Fail over to secondary region if available\n4. Contact upstream ISP if external routing issue\n5. Enable DDoS protection mode if traffic spike detected\n\n📊 **Monitoring:** Set up latency alerts in DataDog/New Relic'
  },
  default: {
    prefix: '🤖 **AI Analysis Complete:**\n',
    body: 'Incident analyzed using historical pattern matching and knowledge base.\n\n🛠️ **General Remediation Steps:**\n1. Identify the blast radius — which services/users are affected?\n2. Check monitoring dashboards for correlated alerts\n3. Review recent deployments and config changes (last 24h)\n4. Roll back last deployment if timing correlates\n5. Escalate to on-call engineer if not resolved in 15 minutes\n\n📋 **Post-Incident:** Schedule root cause analysis (RCA) within 48 hours'
  }
};

function getAIResponse(incident) {
  const cat = incident.category || 'default';
  const resp = AI_RESPONSES[cat] || AI_RESPONSES.default;
  return resp.prefix + resp.body;
}

async function analyzeIncidentAI(incident) {
  // In production: call your Flask /api/agent/analyze endpoint
  // For now: simulate with a delay and mock response
  return new Promise(resolve => {
    setTimeout(() => {
      const response = getAIResponse(incident);
      updateIncident(incident.id, { aiAnalyzed: true, aiResponse: response, analyzedAt: Date.now() });

      // Update AI counters
      const count = parseInt(localStorage.getItem(KEYS.aiCount) || '0') + 1;
      localStorage.setItem(KEYS.aiCount, count);

      // Log it
      const logs = JSON.parse(localStorage.getItem(KEYS.aiLog) || '[]');
      logs.unshift({ time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), msg: `Analyzed ${incident.id}: ${incident.title.substring(0, 40)}...` });
      if (logs.length > 20) logs.pop();
      localStorage.setItem(KEYS.aiLog, JSON.stringify(logs));

      resolve(response);
    }, 1500 + Math.random() * 1000);
  });
}

/* ── Format Helpers ── */
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'Just now';
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function severityBadge(sev) {
  return `<span class="badge badge-${sev}">${sev.charAt(0).toUpperCase() + sev.slice(1)}</span>`;
}

function statusBadge(status) {
  const map = { 'open': 'Open', 'in-progress': 'In Progress', 'resolved': 'Resolved' };
  return `<span class="badge badge-${status}">${map[status] || status}</span>`;
}

/* ── Live Clock ── */
function startClock() {
  const el = document.getElementById('live-time');
  if (!el) return;
  const tick = () => {
    el.textContent = new Date().toLocaleString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric' });
  };
  tick();
  setInterval(tick, 1000);
}

/* ── Sidebar Toggle ── */
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main = document.querySelector('.main-content');
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('mobile-open');
  } else {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('expanded');
  }
}

/* ── Alert Panel ── */
function toggleAlertPanel() {
  document.getElementById('alert-panel')?.classList.toggle('open');
}

function renderAlertPanel() {
  const incidents = getIncidents().filter(i => i.status !== 'resolved').slice(0, 10);
  const list = document.getElementById('alert-list');
  if (!list) return;
  list.innerHTML = incidents.length ? incidents.map(i => `
    <div class="alert-item ${i.severity}" onclick="toggleAlertPanel()">
      <div class="alert-item-title">${i.title}</div>
      <div class="alert-item-time">${i.id} · ${timeAgo(i.createdAt)}</div>
    </div>
  `).join('') : '<div style="padding:16px;color:var(--text-muted);font-size:12px;">No active alerts</div>';

  const count = document.getElementById('bell-count');
  if (count) {
    const critHigh = incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length;
    count.textContent = critHigh;
    count.style.display = critHigh > 0 ? 'flex' : 'none';
  }

  const navCount = document.getElementById('nav-open-count');
  if (navCount) navCount.textContent = incidents.length;
}

/* ── Modal ── */
let currentEditId = null;

function openCreateModal() {
  document.getElementById('create-modal').classList.add('open');
}

function closeCreateModal() {
  document.getElementById('create-modal').classList.remove('open');
  clearForm();
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('create-modal')) closeCreateModal();
}

function closeDetailOutside(e) {
  if (e.target === document.getElementById('detail-modal')) closeDetailModal();
}

function closeDetailModal() {
  document.getElementById('detail-modal')?.classList.remove('open');
  currentEditId = null;
}

function clearForm() {
  ['inc-title','inc-desc','inc-assignee'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sev = document.getElementById('inc-severity');
  if (sev) sev.value = 'medium';
}

function createIncident() {
  const title = document.getElementById('inc-title')?.value?.trim();
  if (!title) { showToast('Please enter an incident title', 'error'); return; }

  const incident = addIncident({
    title,
    severity: document.getElementById('inc-severity')?.value || 'medium',
    category: document.getElementById('inc-category')?.value || 'infrastructure',
    description: document.getElementById('inc-desc')?.value?.trim(),
    assignee: document.getElementById('inc-assignee')?.value?.trim(),
  });

  closeCreateModal();
  showToast(`Incident ${incident.id} created`, 'success');

  const autoAI = document.getElementById('inc-ai-analyze');
  if (!autoAI || autoAI.checked) {
    setTimeout(() => analyzeIncidentAI(incident), 500);
    addAILog(`Queued ${incident.id} for AI analysis`);
  }

  if (typeof refreshPage === 'function') refreshPage();
  renderAlertPanel();
}

/* ── Toast Notifications ── */
function showToast(msg, type = 'info', duration = 3500) {
  const icons = { success: 'fa-circle-check', error: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${icons[type]} toast-icon"></i><span class="toast-msg">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ── AI Log ── */
function addAILog(msg) {
  const logs = JSON.parse(localStorage.getItem(KEYS.aiLog) || '[]');
  logs.unshift({ time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }), msg });
  if (logs.length > 20) logs.pop();
  localStorage.setItem(KEYS.aiLog, JSON.stringify(logs));
}

/* ── Animate counter ── */
function animateCount(el, target, duration = 800) {
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const range = target - start;
  const startTime = performance.now();
  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + range * eased);
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ── Filter incidents (global search) ── */
let searchQuery = '';
function filterIncidents(q) {
  searchQuery = q.toLowerCase();
  if (typeof applyFilter === 'function') applyFilter();
  if (typeof applyFiltersPage === 'function') applyFiltersPage();
}

/* ── Export CSV ── */
function exportCSV() {
  const incidents = getIncidents();
  const headers = ['ID', 'Title', 'Severity', 'Status', 'Category', 'Assignee', 'Created'];
  const rows = incidents.map(i => [
    i.id, `"${i.title}"`, i.severity, i.status, i.category, i.assignee || '', new Date(i.createdAt).toISOString()
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'ira-incidents.csv'; a.click();
  URL.revokeObjectURL(url);
  showToast('Exported incidents as CSV', 'success');
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  seedMockData();
  startClock();
  renderAlertPanel();

  // Stagger card animations
  document.querySelectorAll('.stat-card').forEach((el, i) => {
    el.style.animationDelay = `${i * 80}ms`;
  });
});