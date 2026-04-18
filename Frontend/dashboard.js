// ============================================
// IRA - Dashboard JavaScript
// File: frontend/js/dashboard.js
// ============================================

let activityChart = null;
let donutChart = null;

// ==================== LOAD DASHBOARD DATA ====================

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

fetch("http://localhost:3000/api/data")
.then(res => res.json())
.then(data => {
    console.log(data.message);
}); 

// Example API call
async function getIncidents() {
    const response = await fetch(`${API_BASE_URL}/incidents`);
    const data = await response.json();
    return data.incidents;
}

async function loadDashboardData() {
    // Show loading state
    const criticalEl = document.getElementById('stat-critical');
    const highEl = document.getElementById('stat-high');
    const mediumEl = document.getElementById('stat-medium');
    const resolvedEl = document.getElementById('stat-resolved');
    const avgEl = document.getElementById('stat-avg');
    
    if (criticalEl) criticalEl.textContent = '...';
    if (highEl) highEl.textContent = '...';
    if (mediumEl) mediumEl.textContent = '...';
    if (resolvedEl) resolvedEl.textContent = '...';
    if (avgEl) avgEl.textContent = '--m';
    
    // Fetch stats from backend
    const stats = await API.getStats();
    
    // Update stats display
    if (criticalEl) criticalEl.textContent = stats.critical || 0;
    if (highEl) highEl.textContent = stats.high || 0;
    if (mediumEl) mediumEl.textContent = stats.medium || 0;
    if (resolvedEl) resolvedEl.textContent = stats.resolved || 0;
    
    // Calculate avg response time (from backend or mock)
    const avgTime = stats.avg_resolution_time || Math.floor(Math.random() * 60) + 30;
    if (avgEl) avgEl.textContent = `${avgTime}m`;
    
    // Update AI panel stats
    const aiAnalyzedEl = document.getElementById('ai-analyzed');
    const aiRemediatedEl = document.getElementById('ai-remediated');
    if (aiAnalyzedEl) aiAnalyzedEl.textContent = stats.total || 0;
    if (aiRemediatedEl) aiRemediatedEl.textContent = stats.resolved || 0;
    
    // Load incidents table
    await loadIncidentsTable();
    
    // Load charts
    await loadCharts();
    
    // Update sidebar badge
    updateSidebarBadge();
}

// ==================== LOAD INCIDENTS TABLE ====================

async function loadIncidentsTable() {
    const incidents = await API.getIncidents();
    const tbody = document.getElementById('incidents-tbody');
    const tableCount = document.getElementById('table-count');
    
    if (!tbody) return;
    
    if (!incidents || incidents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px">📭 No incidents found</td></tr>';
        if (tableCount) tableCount.textContent = '0 incidents';
        return;
    }
    
    tbody.innerHTML = incidents.slice(0, 5).map((incident, index) => `
        <tr style="animation-delay:${index * 50}ms" onclick="viewIncidentDetail('${incident.id}')">
            <td class="incident-id">${escapeHtml(incident.id)}</td>
            <td><strong>${escapeHtml(incident.title)}</strong></td>
            <td>${getSeverityBadge(incident.severity)}</td>
            <td>${getStatusBadge(incident.status)}</td>
            <td>${incident.time_ago || 'Just now'}</td>
            <td>
                <div class="table-actions" onclick="event.stopPropagation()">
                    <button class="action-btn" onclick="quickAnalyze('${incident.id}')" title="AI Analyze">
                        <i class="fa-solid fa-robot"></i>
                    </button>
                    ${incident.status !== 'resolved' ? `
                        <button class="action-btn success" onclick="quickResolve('${incident.id}')" title="Resolve">
                            <i class="fa-solid fa-check"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
    
    if (tableCount) tableCount.textContent = `Showing ${Math.min(5, incidents.length)} of ${incidents.length} incidents`;
}

// ==================== LOAD CHARTS ====================

async function loadCharts() {
    const chartData = await API.getCharts();
    
    // Update activity chart
    if (activityChart && chartData.activity) {
        activityChart.data.labels = chartData.activity.labels;
        activityChart.data.datasets[0].data = chartData.activity.data;
        activityChart.update();
    }
    
    // Update donut chart
    if (donutChart && chartData.severity) {
        donutChart.data.datasets[0].data = [
            chartData.severity.critical || 0,
            chartData.severity.high || 0,
            chartData.severity.medium || 0,
            chartData.severity.low || 0
        ];
        donutChart.update();
        
        // Update legend
        updateDonutLegend(chartData.severity);
    }
}

function updateDonutLegend(severity) {
    const legendContainer = document.getElementById('donut-legend');
    if (!legendContainer) return;
    
    legendContainer.innerHTML = `
        <div class="legend-item">
            <span class="legend-label"><span class="legend-dot" style="background:#ef4444"></span>Critical</span>
            <span class="legend-count">${severity.critical || 0}</span>
        </div>
        <div class="legend-item">
            <span class="legend-label"><span class="legend-dot" style="background:#f97316"></span>High</span>
            <span class="legend-count">${severity.high || 0}</span>
        </div>
        <div class="legend-item">
            <span class="legend-label"><span class="legend-dot" style="background:#eab308"></span>Medium</span>
            <span class="legend-count">${severity.medium || 0}</span>
        </div>
        <div class="legend-item">
            <span class="legend-label"><span class="legend-dot" style="background:#22c55e"></span>Low</span>
            <span class="legend-count">${severity.low || 0}</span>
        </div>
    `;
}

// ==================== INITIALIZE CHARTS ====================

function initActivityChart() {
    const ctx = document.getElementById('activity-chart');
    if (!ctx) return;
    
    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Incidents',
                data: [0, 0, 0, 0, 0, 0, 0],
                borderColor: '#1a2a4f',
                backgroundColor: 'rgba(26,42,79,0.05)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#1a2a4f',
                pointBorderColor: '#fff',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { size: 11 } } },
                tooltip: { backgroundColor: '#1a2a4f', titleColor: '#fff', bodyColor: '#e2e8f0' }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}

function initDonutChart() {
    const ctx = document.getElementById('donut-chart');
    if (!ctx) return;
    
    donutChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Critical', 'High', 'Medium', 'Low'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e'],
                borderWidth: 0,
                borderRadius: 8,
                spacing: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false },
                tooltip: { backgroundColor: '#1a2a4f', titleColor: '#fff', bodyColor: '#e2e8f0' }
            },
            cutout: '65%'
        }
    });
}

// ==================== QUICK ACTIONS ====================

async function quickAnalyze(incidentId) {
    showToast(`🤖 Analyzing ${incidentId}...`, 'info');
    const result = await API.analyzeIncident(incidentId);
    if (result.success) {
        showToast(`✅ AI Analysis complete for ${incidentId}`, 'success');
        // Update the incident in the table if needed
        await loadIncidentsTable();
    } else {
        showToast(`❌ Analysis failed: ${result.error}`, 'error');
    }
}

async function quickResolve(incidentId) {
    if (confirm(`Resolve incident ${incidentId}?`)) {
        showToast(`Resolving ${incidentId}...`, 'info');
        const result = await API.resolveIncident(incidentId);
        if (result.success) {
            showToast(`✅ Incident ${incidentId} resolved!`, 'success');
            await loadDashboardData();
        } else {
            showToast(`❌ Failed to resolve: ${result.error}`, 'error');
        }
    }
}

// ==================== VIEW INCIDENT DETAIL ====================

async function viewIncidentDetail(incidentId) {
    const incident = await API.getIncident(incidentId);
    if (!incident) {
        showToast('Incident not found', 'error');
        return;
    }
    
    // Store current incident for modal
    window.currentIncident = incident;
    
    // Open detail modal (you need to create this modal in your HTML)
    openDetailModal(incident);
}

function openDetailModal(incident) {
    // Check if modal exists, if not create it
    let modal = document.getElementById('detail-modal');
    if (!modal) {
        createDetailModal();
        modal = document.getElementById('detail-modal');
    }
    
    // Populate modal with incident data
    document.getElementById('detail-title').textContent = incident.title;
    document.getElementById('detail-id').textContent = `${incident.id} · ${incident.category} · ${incident.time_ago}`;
    document.getElementById('detail-desc').textContent = incident.description || 'No description provided.';
    document.getElementById('detail-meta').innerHTML = `
        ${getSeverityBadge(incident.severity)}
        ${getStatusBadge(incident.status)}
        <span class="badge" style="background:#f1f5f9;color:#475569"><i class="fa-solid fa-user"></i> ${incident.assignee || 'Unassigned'}</span>
    `;
    
    const aiContent = document.getElementById('ai-response-content');
    if (incident.root_cause) {
        aiContent.innerHTML = `
            <div style="margin-bottom:12px">
                <strong>🔍 Root Cause:</strong><br>
                ${escapeHtml(incident.root_cause)}
            </div>
            <div>
                <strong>🛠️ Resolution Steps:</strong><br>
                <pre style="white-space:pre-wrap;font-family:monospace;font-size:12px;margin-top:8px">${escapeHtml(incident.resolution_steps || 'No steps available')}</pre>
            </div>
        `;
    } else {
        aiContent.innerHTML = '<div class="empty-state-small">No AI analysis yet. Click "Analyze" to generate insights.</div>';
    }
    
    modal.classList.add('open');
}

function createDetailModal() {
    const modalHTML = `
        <div class="modal-overlay" id="detail-modal" onclick="closeDetailModal(event)">
            <div class="modal modal-large">
                <div class="modal-header">
                    <div>
                        <h2 id="detail-title">Incident Title</h2>
                        <span id="detail-id" style="font-size:12px;color:#64748b"></span>
                    </div>
                    <button class="modal-close" onclick="closeDetailModal()"><i class="fa-solid fa-xmark"></i></button>
                </div>
                <div class="modal-body">
                    <div class="detail-meta" id="detail-meta"></div>
                    <div class="detail-desc-box">
                        <label>Description</label>
                        <p id="detail-desc"></p>
                    </div>
                    <div class="ai-response-box">
                        <div class="ai-response-header">
                            <i class="fa-solid fa-robot"></i> AI Agent Analysis
                            <span class="ai-thinking" id="ai-thinking"><span></span><span></span><span></span></span>
                        </div>
                        <div id="ai-response-content" class="ai-response-content">Loading...</div>
                    </div>
                    <div class="detail-actions-row">
                        <button class="btn-primary" onclick="analyzeCurrentIncident()"><i class="fa-solid fa-robot"></i> Analyze</button>
                        <button class="btn-success" onclick="resolveCurrentIncident()"><i class="fa-solid fa-check"></i> Mark Resolved</button>
                        <button class="btn-danger" onclick="deleteCurrentIncident()"><i class="fa-solid fa-trash"></i> Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

async function analyzeCurrentIncident() {
    const incident = window.currentIncident;
    if (!incident) return;
    
    const thinking = document.getElementById('ai-thinking');
    const content = document.getElementById('ai-response-content');
    
    if (thinking) thinking.style.display = 'flex';
    content.innerHTML = '<div class="typing-indicator"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
    
    const result = await API.analyzeIncident(incident.id);
    
    if (thinking) thinking.style.display = 'none';
    
    if (result.success && result.data.analysis) {
        content.innerHTML = `
            <div style="margin-bottom:12px">
                <strong>🔍 Root Cause:</strong><br>
                ${escapeHtml(result.data.analysis.root_cause)}
            </div>
            <div>
                <strong>🛠️ Resolution Steps:</strong><br>
                <pre style="white-space:pre-wrap;font-family:monospace;font-size:12px;margin-top:8px">${escapeHtml(result.data.analysis.resolution_steps)}</pre>
            </div>
            <div style="margin-top:12px;color:#22c55e">
                <i class="fa-solid fa-chart-line"></i> Confidence: ${result.data.analysis.confidence}%
            </div>
        `;
        showToast('AI analysis complete!', 'success');
        await loadIncidentsTable();
    } else {
        content.innerHTML = '<div class="empty-state-small">Analysis failed. Please try again.</div>';
        showToast('Analysis failed', 'error');
    }
}

async function resolveCurrentIncident() {
    const incident = window.currentIncident;
    if (!incident) return;
    
    if (confirm(`Resolve incident ${incident.id}?`)) {
        const result = await API.resolveIncident(incident.id);
        if (result.success) {
            showToast(`Incident ${incident.id} resolved!`, 'success');
            closeDetailModal();
            await loadDashboardData();
        } else {
            showToast('Failed to resolve incident', 'error');
        }
    }
}

async function deleteCurrentIncident() {
    const incident = window.currentIncident;
    if (!incident) return;
    
    if (confirm(`Delete incident ${incident.id}? This cannot be undone.`)) {
        const result = await API.deleteIncident(incident.id);
        if (result.success) {
            showToast(`Incident ${incident.id} deleted`, 'warning');
            closeDetailModal();
            await loadDashboardData();
        } else {
            showToast('Failed to delete incident', 'error');
        }
    }
}

function closeDetailModal(event) {
    const modal = document.getElementById('detail-modal');
    if (modal) {
        if (event && event.target !== modal) return;
        modal.classList.remove('open');
    }
    window.currentIncident = null;
}

// ==================== FILTERS & SEARCH ====================

let currentFilter = { severity: 'all', status: 'all' };
let searchQuery = '';

function applyFilter() {
    currentFilter.severity = document.getElementById('severity-filter')?.value || 'all';
    currentFilter.status = document.getElementById('status-filter')?.value || 'all';
    filterIncidents();
}

function filterIncidents() {
    // This will be implemented when you have the full incidents page
    console.log('Filtering incidents:', currentFilter);
}

// ==================== SIDEBAR & ALERTS ====================

function updateSidebarBadge() {
    const navBadge = document.getElementById('nav-open-count');
    if (navBadge) {
        // This will be updated when we have real data
        navBadge.textContent = '3';
    }
}

function toggleAlertPanel() {
    const panel = document.getElementById('alert-panel');
    if (panel) panel.classList.toggle('open');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('mobile-open');
        } else {
            sidebar.classList.toggle('collapsed');
            document.querySelector('.main-content')?.classList.toggle('expanded');
        }
    }
}

// ==================== UTILITIES ====================

function getSeverityBadge(severity) {
    const badges = {
        critical: '<span class="badge badge-critical">🔴 Critical</span>',
        high: '<span class="badge badge-high">🟠 High</span>',
        medium: '<span class="badge badge-medium">🟡 Medium</span>',
        low: '<span class="badge badge-low">🟢 Low</span>'
    };
    return badges[severity] || badges.medium;
}

function getStatusBadge(status) {
    const badges = {
        open: '<span class="badge badge-open">🔴 Open</span>',
        'in-progress': '<span class="badge badge-in-progress">🟡 In Progress</span>',
        resolved: '<span class="badge badge-resolved">✅ Resolved</span>'
    };
    return badges[status] || badges.open;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== SWITCH CHART RANGE ====================

function switchChart(range, btn) {
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    // Implement chart range change if needed
    console.log('Chart range changed to:', range);
}

// ==================== INITIALIZE ON PAGE LOAD ====================

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize charts
    initActivityChart();
    initDonutChart();
    
    // Load dashboard data
    await loadDashboardData();
    
    // Update live time
    function updateLiveTime() {
        const timeEl = document.getElementById('live-time');
        if (timeEl) {
            timeEl.textContent = new Date().toLocaleTimeString();
        }
    }
    setInterval(updateLiveTime, 1000);
    updateLiveTime();
    
    console.log('✅ Dashboard initialized');
});

// Make functions global for HTML onclick handlers
window.applyFilter = applyFilter;
window.switchChart = switchChart;
window.quickAnalyze = quickAnalyze;
window.quickResolve = quickResolve;
window.viewIncidentDetail = viewIncidentDetail;
window.analyzeCurrentIncident = analyzeCurrentIncident;
window.resolveCurrentIncident = resolveCurrentIncident;
window.deleteCurrentIncident = deleteCurrentIncident;
window.closeDetailModal = closeDetailModal;
window.toggleAlertPanel = toggleAlertPanel;
window.toggleSidebar = toggleSidebar;