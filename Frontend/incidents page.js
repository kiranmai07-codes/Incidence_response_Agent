/* =============================================
   IRA — incidents-page.js
   Incidents grid page with cards + detail modal
   ============================================= */

let pageStatus = 'all';
let pageSize = 12;
let pageCurrent = 1;

fetch("http://localhost:3000/api/data")
.then(res => res.json())
.then(data => {
    console.log(data.message);
}); 

function refreshPage() {
  renderIncidentsGrid();
  renderAlertPanel();
}

/* ── Chip Filter ── */
function setChip(btn, status) {
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  pageStatus = status;
  pageCurrent = 1;
  renderIncidentsGrid();
}

function applyFiltersPage() {
  pageCurrent = 1;
  renderIncidentsGrid();
}

/* ── Grid Render ── */
function renderIncidentsGrid() {
  const grid = document.getElementById('incidents-grid');
  if (!grid) return;

  let incidents = getIncidents();

  // Status filter
  if (pageStatus !== 'all') incidents = incidents.filter(i => i.status === pageStatus);

  // Severity filter
  const sevFilter = document.getElementById('sev-filter')?.value || 'all';
  if (sevFilter !== 'all') incidents = incidents.filter(i => i.severity === sevFilter);

  // Category filter
  const catFilter = document.getElementById('cat-filter')?.value || 'all';
  if (catFilter !== 'all') incidents = incidents.filter(i => i.category === catFilter);

  // Search
  if (searchQuery) incidents = incidents.filter(i =>
    i.title.toLowerCase().includes(searchQuery) ||
    i.id.toLowerCase().includes(searchQuery) ||
    (i.description || '').toLowerCase().includes(searchQuery)
  );

  const total = incidents.length;
  const start = (pageCurrent - 1) * pageSize;
  const shown = incidents.slice(start, start + pageSize);

  if (shown.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <i class="fa-solid fa-inbox"></i>
        <h3>No incidents found</h3>
        <p>Try adjusting your filters or create a new incident.</p>
        <button class="btn-primary" onclick="openCreateModal()" style="margin-top:12px">
          <i class="fa-solid fa-plus"></i> Create Incident
        </button>
      </div>`;
  } else {
    grid.innerHTML = shown.map((inc, i) => `
      <div class="incident-card ${inc.severity} ${inc.severity === 'critical' ? 'critical-glow' : ''}"
           style="animation-delay:${i * 50}ms"
           onclick="openDetailModal('${inc.id}')">
        <div class="incident-card-header">
          <div class="incident-card-title">${inc.title}</div>
          ${inc.aiAnalyzed ? '<span title="AI Analyzed" style="color:var(--accent);font-size:12px"><i class="fa-solid fa-robot"></i></span>' : ''}
        </div>
        <div class="incident-card-meta">
          ${severityBadge(inc.severity)}
          ${statusBadge(inc.status)}
          <span class="badge" style="background:var(--bg-input);color:var(--text-muted);font-size:10px">${inc.category}</span>
        </div>
        <p class="incident-card-desc">${inc.description || 'No description provided.'}</p>
        <div class="incident-card-footer">
          <span><i class="fa-solid fa-user" style="margin-right:4px"></i>${inc.assignee || 'Unassigned'}</span>
          <span class="incident-id">${inc.id} · ${timeAgo(inc.createdAt)}</span>
        </div>
      </div>
    `).join('');
  }

  renderPagination(total);
}

/* ── Pagination ── */
function renderPagination(total) {
  const totalPages = Math.ceil(total / pageSize);
  const el = document.getElementById('pagination');
  if (!el || totalPages <= 1) { if (el) el.innerHTML = ''; return; }

  let html = '';
  if (pageCurrent > 1) html += `<button class="page-btn" onclick="goPage(${pageCurrent - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
  for (let p = 1; p <= totalPages; p++) {
    html += `<button class="page-btn ${p === pageCurrent ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
  }
  if (pageCurrent < totalPages) html += `<button class="page-btn" onclick="goPage(${pageCurrent + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
  el.innerHTML = html;
}

function goPage(p) { pageCurrent = p; renderIncidentsGrid(); window.scrollTo(0,0); }

/* ── Detail Modal ── */
function openDetailModal(id) {
  const inc = getIncidentById(id);
  if (!inc) return;
  currentEditId = id;

  document.getElementById('detail-title').textContent = inc.title;
  document.getElementById('detail-id').textContent = `${inc.id} · ${inc.category} · ${timeAgo(inc.createdAt)}`;
  document.getElementById('detail-desc').textContent = inc.description || 'No description.';
  document.getElementById('detail-meta').innerHTML = `
    ${severityBadge(inc.severity)} ${statusBadge(inc.status)}
    <span class="badge" style="background:var(--bg-input);color:var(--text-muted)"><i class="fa-solid fa-user"></i> ${inc.assignee || 'Unassigned'}</span>
    <span class="badge" style="background:var(--bg-input);color:var(--text-muted)">${inc.category}</span>
  `;

  const content = document.getElementById('ai-response-content');
  const thinking = document.getElementById('ai-thinking');

  if (inc.aiResponse) {
    content.textContent = inc.aiResponse;
    if (thinking) thinking.style.display = 'none';
  } else {
    content.textContent = 'No AI analysis yet. Click "Re-analyze" to get AI recommendations.';
    if (thinking) thinking.style.display = 'none';
  }

  document.getElementById('detail-modal').classList.add('open');
}

async function analyzeWithAI() {
  if (!currentEditId) return;
  const inc = getIncidentById(currentEditId);
  if (!inc) return;

  const content = document.getElementById('ai-response-content');
  const thinking = document.getElementById('ai-thinking');
  if (content) content.textContent = 'Analyzing incident...';
  if (thinking) thinking.style.display = 'flex';

  const response = await analyzeIncidentAI(inc);
  if (content) content.textContent = response;
  if (thinking) thinking.style.display = 'none';
  showToast('AI analysis complete', 'success');
  renderIncidentsGrid();
}

function resolveIncident() {
  if (!currentEditId) return;
  updateIncident(currentEditId, { status: 'resolved' });
  closeDetailModal();
  showToast('Incident marked as resolved ✓', 'success');
  refreshPage();
}

function deleteIncident() {
  if (!currentEditId) return;
  deleteIncidentById(currentEditId);
  closeDetailModal();
  showToast('Incident deleted', 'warning');
  refreshPage();
}

function closeDetailModal() {
  document.getElementById('detail-modal')?.classList.remove('open');
  currentEditId = null;
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  refreshPage();
});