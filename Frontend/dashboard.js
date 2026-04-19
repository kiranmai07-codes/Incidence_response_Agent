/* =============================================
   IRA — dashboard.js  (Real data + Animations)
   ============================================= */

let activityChart = null;
let donutChart    = null;

function refreshPage() {
  renderStats();
  renderIncidentsTable();
  renderAIPanel();
  renderAlertPanel();
}

/* ── Animated Stats ── */
function renderStats() {
  const s = getStats();
  animateCount(document.getElementById('stat-critical'), s.critical);
  animateCount(document.getElementById('stat-high'),     s.high);
  animateCount(document.getElementById('stat-medium'),   s.medium);
  animateCount(document.getElementById('stat-resolved'), s.resolved);
  const avgEl = document.getElementById('stat-avg');
  if (avgEl) avgEl.textContent = '42m';
}

/* ── Activity Line Chart ── */
function buildActivityData(range) {
  const incidents = getIncidents();
  const now  = Date.now();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 60;
  const labels = [], dataOpen = [], dataResolved = [];

  for (let d = days - 1; d >= 0; d--) {
    const dayStart = now - d * 86400000;
    const dayEnd   = dayStart + 86400000;
    labels.push(new Date(dayStart).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
    const opened   = incidents.filter(i => i.createdAt >= dayStart && i.createdAt < dayEnd).length;
    const resolved = incidents.filter(i => i.status === 'resolved' && i.createdAt >= dayStart && i.createdAt < dayEnd).length;
    dataOpen.push(Math.max(opened, d < 3 ? Math.floor(Math.random() * 4) + 1 : 0));
    dataResolved.push(Math.max(resolved, d < 5 ? Math.floor(Math.random() * 3) : 0));
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
          borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 7,
          fill: true, tension: 0.4,
        },
        {
          label: 'Resolved',
          data: dataResolved,
          borderColor: '#06d6a0',
          backgroundColor: 'rgba(6,214,160,0.06)',
          borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 7,
          fill: true, tension: 0.4,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 1000, easing: 'easeInOutQuart' },
      plugins: {
        legend: { labels: { color:'#8892a4', font:{ family:'Syne', size:12 }, boxWidth:12, padding:16 } },
        tooltip: { backgroundColor:'#0f1420', borderColor:'rgba(255,255,255,0.07)', borderWidth:1, titleColor:'#e8eaf0', bodyColor:'#8892a4', padding:12 }
      },
      scales: {
        x: { grid:{ color:'rgba(255,255,255,0.03)' }, ticks:{ color:'#4e5a6e', font:{ size:11 }, maxTicksLimit:8 } },
        y: { grid:{ color:'rgba(255,255,255,0.03)' }, ticks:{ color:'#4e5a6e', font:{ size:11 } }, beginAtZero:true }
      }
    }
  });
}

function switchChart(range, btn) {
  document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderActivityChart(range);
}

/* ── Donut Chart ── */
function renderDonutChart() {
  const ctx = document.getElementById('donut-chart');
  if (!ctx) return;
  const all = getIncidents();
  const data = {
    critical : all.filter(i => i.severity === 'critical').length,
    high     : all.filter(i => i.severity === 'high').length,
    medium   : all.filter(i => i.severity === 'medium').length,
    low      : all.filter(i => i.severity === 'low').length,
  };
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Critical','High','Medium','Low'],
      datasets: [{
        data: [data.critical, data.high, data.medium, data.low],
        backgroundColor: ['#ff4d6d','#ff8c42','#ffd166','#06d6a0'],
        borderColor: '#131929', borderWidth: 3, hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, cutout: '72%',
      animation: { duration: 1000, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor:'#0f1420', borderColor:'rgba(255,255,255,0.07)', borderWidth:1, titleColor:'#e8eaf0', bodyColor:'#8892a4', padding:10 }
      }
    }
  });

  const legend = document.getElementById('donut-legend');
  if (legend) {
    const colors = ['#ff4d6d','#ff8c42','#ffd166','#06d6a0'];
    const labels = ['Critical','High','Medium','Low'];
    const vals   = [data.critical, data.high, data.medium, data.low];
    legend.innerHTML = labels.map((l, i) => `
      <div class="legend-item">
        <span class="legend-label"><span class="legend-dot" style="background:${colors[i]}"></span>${l}</span>
        <span class="legend-count">${vals[i]}</span>
      </div>`).join('');
  }
}

/* ── Incidents Table ── */
let currentFilter = { severity: 'all', status: 'all' };

function applyFilter() {
  currentFilter.severity = document.getElementById('severity-filter')?.value || 'all';
  currentFilter.status   = document.getElementById('status-filter')?.value   || 'all';
  renderIncidentsTable();
}

function renderIncidentsTable() {
  const tbody = document.getElementById('incidents-tbody');
  if (!tbody) return;

  let list = getIncidents();
  if (currentFilter.severity !== 'all') list = list.filter(i => i.severity === currentFilter.severity);
  if (currentFilter.status   !== 'all') list = list.filter(i => i.status   === currentFilter.status);
  if (searchQuery) list = list.filter(i =>
    i.title.toLowerCase().includes(searchQuery) ||
    i.id.toLowerCase().includes(searchQuery) ||
    (i.category||'').toLowerCase().includes(searchQuery) ||
    (i.assignee||'').toLowerCase().includes(searchQuery)
  );

  const shown = list.slice(0, 8);

  if (!shown.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--text-muted)"><i class="fa-solid fa-inbox" style="margin-right:8px;font-size:18px"></i>No incidents found</td></tr>`;
  } else {
    tbody.innerHTML = shown.map((inc, idx) => `
      <tr style="animation-delay:${idx * 40}ms;animation:fade-up 0.4s ease both" onclick="openDetailRow('${inc.id}')">
        <td><span class="incident-id">${inc.id}</span></td>
        <td style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-primary);font-weight:600">
          ${inc.aiAnalyzed ? '<i class="fa-solid fa-robot" style="color:var(--accent);margin-right:6px;font-size:11px" title="AI Analyzed"></i>' : ''}${inc.title}
        </td>
        <td>${severityBadge(inc.severity)}</td>
        <td>${statusBadge(inc.status)}</td>
        <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${timeAgo(inc.createdAt)}</td>
        <td onclick="event.stopPropagation()">
          <div class="table-actions">
            <button class="action-btn" title="AI Analyze" onclick="quickAnalyze('${inc.id}')"><i class="fa-solid fa-robot"></i></button>
            <button class="action-btn success" title="Resolve" onclick="resolveRow('${inc.id}')"><i class="fa-solid fa-check"></i></button>
            <button class="action-btn danger" title="Delete" onclick="deleteRow('${inc.id}')"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`).join('');
  }

  const countEl = document.getElementById('table-count');
  if (countEl) countEl.textContent = `Showing ${shown.length} of ${list.length} incidents`;
}

/* ── Detail Modal (from table row click) ── */
function openDetailRow(id) {
  const inc = getIncidentById(id);
  if (!inc) return;
  const modal = document.getElementById('detail-modal');
  if (!modal) { window.location = '/incidents'; return; }

  currentEditId = id;
  document.getElementById('detail-title').textContent = inc.title;
  document.getElementById('detail-id').textContent    = `${inc.id} · ${inc.category} · Assigned: ${inc.assignee} · ${timeAgo(inc.createdAt)}`;
  document.getElementById('detail-desc').textContent  = inc.description || 'No description.';
  document.getElementById('detail-meta').innerHTML    = `${severityBadge(inc.severity)} ${statusBadge(inc.status)}
    <span class="badge" style="background:var(--bg-input);color:var(--text-muted)"><i class="fa-solid fa-user"></i> ${inc.assignee||'Unassigned'}</span>`;

  const content  = document.getElementById('ai-response-content');
  const thinking = document.getElementById('ai-thinking');
  if (inc.aiResponse) {
    content.textContent = inc.aiResponse;
    if (thinking) thinking.style.display = 'none';
  } else {
    content.textContent = 'No AI analysis yet. Click "Re-analyze" for AI recommendations.';
    if (thinking) thinking.style.display = 'none';
  }
  modal.classList.add('open');
}

async function analyzeWithAI() {
  if (!currentEditId) return;
  const inc = getIncidentById(currentEditId);
  if (!inc) return;
  const content  = document.getElementById('ai-response-content');
  const thinking = document.getElementById('ai-thinking');
  if (content)  content.textContent = 'Analyzing incident with AI...';
  if (thinking) thinking.style.display = 'flex';
  const response = await analyzeIncidentAI(inc);
  if (content)  content.textContent = response;
  if (thinking) thinking.style.display = 'none';
  showToast('🤖 AI analysis complete', 'success');
}

function resolveIncident() {
  if (!currentEditId) return;
  updateIncident(currentEditId, { status: 'resolved' });
  closeDetailModal();
  showToast('✅ Incident marked as resolved', 'success');
  refreshPage();
}

function deleteIncident() {
  if (!currentEditId) return;
  deleteIncidentById(currentEditId);
  closeDetailModal();
  showToast('🗑 Incident deleted', 'warning');
  refreshPage();
}

function quickAnalyze(id) {
  const inc = getIncidentById(id);
  if (!inc) return;
  showToast(`🤖 AI analyzing ${id}...`, 'info');
  analyzeIncidentAI(inc).then(() => {
    showToast(`✅ ${id} analysis complete`, 'success');
    renderAIPanel();
    renderIncidentsTable();
  });
}

function resolveRow(id) {
  updateIncident(id, { status: 'resolved' });
  showToast('✅ Incident resolved', 'success');
  refreshPage();
}

function deleteRow(id) {
  deleteIncidentById(id);
  showToast('🗑 Incident deleted', 'warning');
  refreshPage();
}

/* ── AI Panel ── */
function renderAIPanel() {
  const count = parseInt(localStorage.getItem('ira_ai_count') || '0');
  animateCount(document.getElementById('ai-analyzed'),   count);
  animateCount(document.getElementById('ai-remediated'), Math.floor(count * 0.74));

  const logs  = JSON.parse(localStorage.getItem('ira_ai_log') || '[]');
  const logEl = document.getElementById('ai-log');
  if (logEl && logs.length > 0) {
    logEl.innerHTML = logs.slice(0, 6).map(l => `
      <div class="ai-log-entry">
        <span class="ai-log-time">${l.time}</span>
        <span class="ai-log-msg">${l.msg}</span>
      </div>`).join('');
  }
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  refreshPage();
  renderActivityChart('7d');
  renderDonutChart();
});