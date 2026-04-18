/* =============================================
   IRA — dashboard.js
   Dashboard charts, stats, and logic
   ============================================= */

let activityChart = null;
let donutChart = null;
let currentChartRange = '7d';

/* ── Main init ── */
function refreshPage() {
  renderStats();
  renderIncidentsTable();
  renderAIPanel();
  renderAlertPanel();
}

/* ── Stats ── */
function renderStats() {
  const s = getStats();
  animateCount(document.getElementById('stat-critical'), s.critical);
  animateCount(document.getElementById('stat-high'), s.high);
  animateCount(document.getElementById('stat-medium'), s.medium);
  animateCount(document.getElementById('stat-resolved'), s.resolved);

  const avgEl = document.getElementById('stat-avg');
  if (avgEl) avgEl.textContent = Math.floor(30 + Math.random() * 60) + 'm';
}

/* ── Activity Chart (line) ── */
function buildActivityData(range) {
  const incidents = getIncidents();
  const now = Date.now();
  let days = range === '7d' ? 7 : range === '30d' ? 30 : 60;
  const labels = [];
  const dataOpen = [];
  const dataResolved = [];

  for (let d = days - 1; d >= 0; d--) {
    const dayStart = now - d * 86400000;
    const dayEnd = dayStart + 86400000;
    const label = new Date(dayStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    labels.push(label);
    const opened = incidents.filter(i => i.createdAt >= dayStart && i.createdAt < dayEnd).length;
    const resolved = incidents.filter(i => i.status === 'resolved' && i.createdAt >= dayStart && i.createdAt < dayEnd).length;
    // Add some variation for visual interest
    dataOpen.push(opened + Math.floor(Math.random() * 3));
    dataResolved.push(resolved + Math.floor(Math.random() * 2));
  }
  return { labels, dataOpen, dataResolved };
}

function renderActivityChart(range = '7d') {
  const ctx = document.getElementById('activity-chart');
  if (!ctx) return;

  const { labels, dataOpen, dataResolved } = buildActivityData(range);

  if (activityChart) activityChart.destroy();

  activityChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Opened',
          data: dataOpen,
          borderColor: '#ff4d6d',
          backgroundColor: 'rgba(255,77,109,0.08)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Resolved',
          data: dataResolved,
          borderColor: '#06d6a0',
          backgroundColor: 'rgba(6,214,160,0.06)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#8892a4', font: { family: 'Syne', size: 12 }, boxWidth: 12, padding: 16 }
        },
        tooltip: {
          backgroundColor: '#0f1420',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8892a4',
          padding: 12,
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4e5a6e', font: { size: 11 }, maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4e5a6e', font: { size: 11 } }, beginAtZero: true }
      }
    }
  });
}

function switchChart(range, btn) {
  currentChartRange = range;
  document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderActivityChart(range);
}

/* ── Donut Chart ── */
function renderDonutChart() {
  const ctx = document.getElementById('donut-chart');
  if (!ctx) return;

  const incidents = getIncidents();
  const data = {
    critical: incidents.filter(i => i.severity === 'critical').length,
    high: incidents.filter(i => i.severity === 'high').length,
    medium: incidents.filter(i => i.severity === 'medium').length,
    low: incidents.filter(i => i.severity === 'low').length,
  };

  if (donutChart) donutChart.destroy();

  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [{
        data: [data.critical, data.high, data.medium, data.low],
        backgroundColor: ['#ff4d6d', '#ff8c42', '#ffd166', '#06d6a0'],
        borderColor: '#131929',
        borderWidth: 3,
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f1420',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8892a4',
          padding: 10,
        }
      }
    }
  });

  // Render legend
  const legend = document.getElementById('donut-legend');
  if (legend) {
    const colors = ['#ff4d6d', '#ff8c42', '#ffd166', '#06d6a0'];
    const labels = ['Critical', 'High', 'Medium', 'Low'];
    const vals = [data.critical, data.high, data.medium, data.low];
    legend.innerHTML = labels.map((l, i) => `
      <div class="legend-item">
        <span class="legend-label"><span class="legend-dot" style="background:${colors[i]}"></span>${l}</span>
        <span class="legend-count">${vals[i]}</span>
      </div>
    `).join('');
  }
}

/* ── Incidents Table ── */
let currentFilter = { severity: 'all', status: 'all' };

function applyFilter() {
  currentFilter.severity = document.getElementById('severity-filter')?.value || 'all';
  currentFilter.status = document.getElementById('status-filter')?.value || 'all';
  renderIncidentsTable();
}

function renderIncidentsTable() {
  const tbody = document.getElementById('incidents-tbody');
  if (!tbody) return;

  let incidents = getIncidents();

  // Filter
  if (currentFilter.severity !== 'all') incidents = incidents.filter(i => i.severity === currentFilter.severity);
  if (currentFilter.status !== 'all') incidents = incidents.filter(i => i.status === currentFilter.status);
  if (searchQuery) incidents = incidents.filter(i =>
    i.title.toLowerCase().includes(searchQuery) ||
    i.id.toLowerCase().includes(searchQuery) ||
    (i.category || '').toLowerCase().includes(searchQuery)
  );

  const shown = incidents.slice(0, 8);

  if (shown.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted)"><i class="fa-solid fa-inbox" style="margin-right:8px"></i>No incidents found</td></tr>`;
  } else {
    tbody.innerHTML = shown.map((inc, idx) => `
      <tr style="animation-delay:${idx * 40}ms" onclick="openDetailRow('${inc.id}')">
        <td><span class="incident-id">${inc.id}</span></td>
        <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-primary)">${inc.title}</td>
        <td>${severityBadge(inc.severity)}</td>
        <td>${statusBadge(inc.status)}</td>
        <td style="font-family:var(--font-mono);font-size:11px">${timeAgo(inc.createdAt)}</td>
        <td onclick="event.stopPropagation()">
          <div class="table-actions">
            <button class="action-btn" title="AI Analyze" onclick="quickAnalyze('${inc.id}')"><i class="fa-solid fa-robot"></i></button>
            <button class="action-btn success" title="Resolve" onclick="resolveRow('${inc.id}')"><i class="fa-solid fa-check"></i></button>
            <button class="action-btn danger" title="Delete" onclick="deleteRow('${inc.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  const countEl = document.getElementById('table-count');
  if (countEl) countEl.textContent = `Showing ${shown.length} of ${incidents.length} incidents`;
}

function openDetailRow(id) {
  const inc = getIncidentById(id);
  if (!inc) return;
  const modal = document.getElementById('detail-modal');
  if (!modal) { window.location = 'incidents.html'; return; }

  currentEditId = id;
  document.getElementById('detail-title').textContent = inc.title;
  document.getElementById('detail-id').textContent = `${inc.id} · ${inc.category} · ${timeAgo(inc.createdAt)}`;
  document.getElementById('detail-desc').textContent = inc.description || 'No description.';
  document.getElementById('detail-meta').innerHTML = `
    ${severityBadge(inc.severity)} ${statusBadge(inc.status)}
    <span class="badge" style="background:var(--bg-input);color:var(--text-muted)"><i class="fa-solid fa-user"></i> ${inc.assignee || 'Unassigned'}</span>
  `;

  const content = document.getElementById('ai-response-content');
  const thinking = document.getElementById('ai-thinking');

  if (inc.aiResponse) {
    content.textContent = inc.aiResponse;
    if (thinking) thinking.style.display = 'none';
  } else {
    content.textContent = 'Click "Re-analyze" to get AI suggestions.';
    if (thinking) thinking.style.display = 'none';
  }

  modal.classList.add('open');
}

async function analyzeWithAI() {
  if (!currentEditId) return;
  const inc = getIncidentById(currentEditId);
  if (!inc) return;

  const content = document.getElementById('ai-response-content');
  const thinking = document.getElementById('ai-thinking');
  if (content) content.textContent = 'Analyzing...';
  if (thinking) thinking.style.display = 'flex';

  const response = await analyzeIncidentAI(inc);
  if (content) content.textContent = response;
  if (thinking) thinking.style.display = 'none';
  showToast('AI analysis complete', 'success');
}

function resolveIncident() {
  if (!currentEditId) return;
  updateIncident(currentEditId, { status: 'resolved' });
  closeDetailModal();
  showToast('Incident marked as resolved', 'success');
  refreshPage();
}

function deleteIncident() {
  if (!currentEditId) return;
  deleteIncidentById(currentEditId);
  closeDetailModal();
  showToast('Incident deleted', 'warning');
  refreshPage();
}

function quickAnalyze(id) {
  const inc = getIncidentById(id);
  if (!inc) return;
  showToast(`AI analyzing ${id}...`, 'info');
  analyzeIncidentAI(inc).then(() => {
    showToast(`${id} analysis complete`, 'success');
    addAILog(`Analyzed ${id}: ${inc.title.substring(0, 40)}...`);
    renderAIPanel();
  });
}

function resolveRow(id) {
  updateIncident(id, { status: 'resolved' });
  showToast('Incident resolved', 'success');
  refreshPage();
}

function deleteRow(id) {
  deleteIncidentById(id);
  showToast('Incident deleted', 'warning');
  refreshPage();
}

/* ── AI Panel ── */
function renderAIPanel() {
  const count = parseInt(localStorage.getItem('ira_ai_count') || '0');
  const analyzed = document.getElementById('ai-analyzed');
  const remediated = document.getElementById('ai-remediated');
  if (analyzed) animateCount(analyzed, count);
  if (remediated) animateCount(remediated, Math.floor(count * 0.72));

  const logs = JSON.parse(localStorage.getItem('ira_ai_log') || '[]');
  const logEl = document.getElementById('ai-log');
  if (logEl && logs.length > 0) {
    logEl.innerHTML = logs.slice(0, 5).map(l => `
      <div class="ai-log-entry">
        <span class="ai-log-time">${l.time}</span>
        <span class="ai-log-msg">${l.msg}</span>
      </div>
    `).join('');
  }
}

/* ── Simulate live new incident (every 90s) ── */
function startLiveSimulation() {
  setInterval(() => {
    const titles = [
      'High CPU usage on worker-node-03',
      'Kafka consumer lag increasing',
      'S3 upload failures in eu-west-1',
      'Elasticsearch cluster yellow status',
      'Auth service response time spike',
    ];
    const severities = ['critical', 'high', 'medium', 'low'];
    const categories = ['infrastructure', 'database', 'application', 'network', 'security'];

    const incident = addIncident({
      title: titles[Math.floor(Math.random() * titles.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      category: categories[Math.floor(Math.random() * categories.length)],
      description: 'Auto-detected by monitoring agent.',
      assignee: 'On-Call Engineer',
    });

    showToast(`🚨 New incident: ${incident.id}`, 'warning', 5000);
    refreshPage();
  }, 90000);
}

/* ── Export report ── */
function exportReport() { exportCSV(); }

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  refreshPage();
  renderActivityChart('7d');
  renderDonutChart();
  startLiveSimulation();
});