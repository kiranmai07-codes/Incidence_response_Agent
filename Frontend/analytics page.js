/* =============================================
   IRA — analytics-page.js
   Analytics page with multiple charts
   ============================================= */

function refreshPage() {
  renderKPIs();
  renderTimelineChart();
  renderCategoryChart();
  renderStatusChart();
  renderSeverityChart();
  renderAnalyticsTable();
  renderAlertPanel();
}

/* ── KPIs ── */
function renderKPIs() {
  const stats = getStats();
  const all = getIncidents();
  const aiCount = parseInt(localStorage.getItem('ira_ai_count') || '0');

  animateCount(document.getElementById('kpi-total'), stats.total);
  animateCount(document.getElementById('kpi-resolved'), stats.resolved);
  animateCount(document.getElementById('kpi-ai'), aiCount);

  const rate = stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0;
  const rateEl = document.getElementById('kpi-rate');
  if (rateEl) rateEl.textContent = rate + '%';

  const avgEl = document.getElementById('kpi-avg');
  if (avgEl) avgEl.textContent = (35 + Math.floor(Math.random() * 40));
}

/* ── Timeline Chart ── */
function renderTimelineChart() {
  const ctx = document.getElementById('timeline-chart');
  if (!ctx) return;

  const incidents = getIncidents();
  const now = Date.now();
  const labels = [], data = [];

  for (let d = 13; d >= 0; d--) {
    const dayStart = now - d * 86400000;
    const dayEnd = dayStart + 86400000;
    labels.push(new Date(dayStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    data.push(incidents.filter(i => i.createdAt >= dayStart && i.createdAt < dayEnd).length + Math.floor(Math.random() * 4));
  }

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Incidents',
        data,
        backgroundColor: data.map(v => v > 4 ? 'rgba(255,77,109,0.7)' : 'rgba(79,142,247,0.6)'),
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f1420',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8892a4',
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4e5a6e', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4e5a6e', font: { size: 11 } }, beginAtZero: true }
      }
    }
  });
}

/* ── Category Donut ── */
function renderCategoryChart() {
  const ctx = document.getElementById('category-chart');
  if (!ctx) return;

  const incidents = getIncidents();
  const cats = ['infrastructure', 'security', 'application', 'network', 'database'];
  const data = cats.map(c => incidents.filter(i => i.category === c).length);
  const colors = ['#4f8ef7', '#ff4d6d', '#06d6a0', '#ffd166', '#b18aff'];

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: cats.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
      datasets: [{ data, backgroundColor: colors, borderColor: '#131929', borderWidth: 3, hoverOffset: 6 }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8892a4', font: { family: 'Syne', size: 11 }, boxWidth: 10, padding: 12 }
        },
        tooltip: {
          backgroundColor: '#0f1420',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8892a4',
        }
      }
    }
  });
}

/* ── Status Pie ── */
function renderStatusChart() {
  const ctx = document.getElementById('status-chart');
  if (!ctx) return;

  const stats = getStats();

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Open', 'In Progress', 'Resolved'],
      datasets: [{
        data: [stats.open, stats.inProgress, stats.resolved],
        backgroundColor: ['#ff4d6d', '#4f8ef7', '#06d6a0'],
        borderColor: '#131929',
        borderWidth: 3,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#8892a4', font: { family: 'Syne', size: 11 }, boxWidth: 10, padding: 12 }
        },
        tooltip: {
          backgroundColor: '#0f1420',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8892a4',
        }
      }
    }
  });
}

/* ── Severity Trend Line ── */
function renderSeverityChart() {
  const ctx = document.getElementById('severity-chart');
  if (!ctx) return;

  const labels = [];
  const now = Date.now();
  for (let d = 6; d >= 0; d--) {
    labels.push(new Date(now - d * 86400000).toLocaleDateString('en-US', { weekday: 'short' }));
  }

  const mkData = () => Array.from({length: 7}, () => Math.floor(Math.random() * 5));

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Critical', data: mkData(), borderColor: '#ff4d6d', backgroundColor: 'rgba(255,77,109,0.05)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 4 },
        { label: 'High', data: mkData(), borderColor: '#ff8c42', backgroundColor: 'rgba(255,140,66,0.05)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 4 },
        { label: 'Medium', data: mkData(), borderColor: '#ffd166', backgroundColor: 'rgba(255,209,102,0.05)', borderWidth: 2, tension: 0.4, fill: true, pointRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: { color: '#8892a4', font: { family: 'Syne', size: 12 }, boxWidth: 12, padding: 14 }
        },
        tooltip: {
          backgroundColor: '#0f1420',
          borderColor: 'rgba(255,255,255,0.07)',
          borderWidth: 1,
          titleColor: '#e8eaf0',
          bodyColor: '#8892a4',
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4e5a6e', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#4e5a6e', font: { size: 11 } }, beginAtZero: true }
      }
    }
  });
}

/* ── Table ── */
function renderAnalyticsTable() {
  const tbody = document.getElementById('analytics-tbody');
  if (!tbody) return;

  const incidents = getIncidents().slice(0, 8);
  tbody.innerHTML = incidents.map((inc, i) => `
    <tr style="animation-delay:${i*50}ms">
      <td><span class="incident-id">${inc.id}</span></td>
      <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-primary)">${inc.title}</td>
      <td>${severityBadge(inc.severity)}</td>
      <td><span class="badge" style="background:var(--bg-input);color:var(--text-muted)">${inc.category}</span></td>
      <td style="font-family:var(--font-mono);font-size:11px">${Math.floor(20 + Math.random() * 120)}m</td>
      <td>${statusBadge(inc.status)}</td>
    </tr>
  `).join('');
}

function exportReport() { exportCSV(); }

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  refreshPage();
});