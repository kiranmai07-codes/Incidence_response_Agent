/* =================================================
   IRA — incidents-page.js  | COMPLETE STANDALONE
   ================================================= */

var pageStatus  = 'all';
var pageSize    = 12;
var pageCurrent = 1;

function refreshPage() {
  renderGrid();
  renderAlertPanel();
}

/* ── Status chip filter ── */
function setChip(btn, status) {
  document.querySelectorAll('.chip').forEach(function(c){ c.classList.remove('active'); });
  btn.classList.add('active');
  pageStatus  = status;
  pageCurrent = 1;
  renderGrid();
}

function applyFiltersPage() {
  pageCurrent = 1;
  renderGrid();
}

/* ── Main grid render ── */
function renderGrid() {
  var grid = document.getElementById('incidents-grid');
  if (!grid) return;

  var list = getIncidents();   /* getIncidents() is defined in app.js */

  /* apply filters */
  if (pageStatus !== 'all') {
    list = list.filter(function(i){ return i.status === pageStatus; });
  }

  var sevF = document.getElementById('sev-filter');
  if (sevF && sevF.value !== 'all') {
    list = list.filter(function(i){ return i.severity === sevF.value; });
  }

  var catF = document.getElementById('cat-filter');
  if (catF && catF.value !== 'all') {
    list = list.filter(function(i){ return i.category === catF.value; });
  }

  if (searchQuery) {
    list = list.filter(function(i){
      return (i.title       ||'').toLowerCase().includes(searchQuery) ||
             (i.id          ||'').toLowerCase().includes(searchQuery) ||
             (i.description ||'').toLowerCase().includes(searchQuery) ||
             (i.assignee    ||'').toLowerCase().includes(searchQuery);
    });
  }

  var total = list.length;
  var start = (pageCurrent - 1) * pageSize;
  var shown = list.slice(start, start + pageSize);

  if (shown.length === 0) {
    grid.innerHTML =
      '<div class="empty-state" style="grid-column:1/-1">' +
        '<i class="fa-solid fa-inbox"></i>' +
        '<h3>No incidents found</h3>' +
        '<p>Try adjusting your filters or create a new incident.</p>' +
        '<button class="btn-primary" onclick="openCreateModal()" style="margin-top:14px">' +
          '<i class="fa-solid fa-plus"></i> Create Incident' +
        '</button>' +
      '</div>';
  } else {
    grid.innerHTML = shown.map(function(inc, i) {
      var aiIcon = inc.aiAnalyzed
        ? '<span title="AI Analyzed" style="color:var(--accent);font-size:13px;flex-shrink:0"><i class="fa-solid fa-robot"></i></span>'
        : '';
      var critClass = inc.severity === 'critical' ? ' critical-glow' : '';
      return (
        '<div class="incident-card ' + inc.severity + critClass + '" ' +
             'style="animation-delay:' + (i * 55) + 'ms" ' +
             'onclick="openDetail(\'' + inc.id + '\')">' +

          '<div class="incident-card-header">' +
            '<div class="incident-card-title">' + inc.title + '</div>' +
            aiIcon +
          '</div>' +

          '<div class="incident-card-meta">' +
            severityBadge(inc.severity) +
            statusBadge(inc.status) +
            '<span class="badge" style="background:var(--bg-input);color:var(--text-muted);font-size:10px">' +
              inc.category +
            '</span>' +
          '</div>' +

          '<p class="incident-card-desc">' + (inc.description || 'No description provided.') + '</p>' +

          '<div class="incident-card-footer">' +
            '<span><i class="fa-solid fa-user" style="margin-right:4px;font-size:10px"></i>' + (inc.assignee || 'Unassigned') + '</span>' +
            '<span class="incident-id">' + inc.id + ' · ' + timeAgo(inc.createdAt) + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    /* animate cards in */
    var cards = grid.querySelectorAll('.incident-card');
    cards.forEach(function(el, i){
      el.style.opacity   = '0';
      el.style.transform = 'translateY(18px)';
      el.style.transition= 'opacity 0.4s ease, transform 0.4s ease';
      setTimeout(function(){
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
      }, i * 55);
    });
  }

  renderPagination(total);
}

/* ── Pagination ── */
function renderPagination(total) {
  var totalPages = Math.ceil(total / pageSize);
  var el = document.getElementById('pagination');
  if (!el) return;
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  var html = '';
  if (pageCurrent > 1)
    html += '<button class="page-btn" onclick="goPage(' + (pageCurrent-1) + ')"><i class="fa-solid fa-chevron-left"></i></button>';
  for (var p = 1; p <= totalPages; p++)
    html += '<button class="page-btn ' + (p===pageCurrent?'active':'') + '" onclick="goPage(' + p + ')">' + p + '</button>';
  if (pageCurrent < totalPages)
    html += '<button class="page-btn" onclick="goPage(' + (pageCurrent+1) + ')"><i class="fa-solid fa-chevron-right"></i></button>';
  el.innerHTML = html;
}

function goPage(p) { pageCurrent = p; renderGrid(); window.scrollTo(0,0); }

/* ── Detail modal ── */
function openDetail(id) {
  var inc   = getIncidentById(id);
  if (!inc) return;
  currentEditId = id;

  var titleEl = document.getElementById('detail-title');
  var idEl    = document.getElementById('detail-id');
  var descEl  = document.getElementById('detail-desc');
  var metaEl  = document.getElementById('detail-meta');
  var contentEl  = document.getElementById('ai-response-content');
  var thinkingEl = document.getElementById('ai-thinking');
  var modal   = document.getElementById('detail-modal');

  if (titleEl)  titleEl.textContent = inc.title;
  if (idEl)     idEl.textContent    = inc.id + ' · ' + inc.category + ' · ' + timeAgo(inc.createdAt);
  if (descEl)   descEl.textContent  = inc.description || 'No description.';
  if (metaEl)   metaEl.innerHTML    =
    severityBadge(inc.severity) + ' ' + statusBadge(inc.status) +
    '<span class="badge" style="background:var(--bg-input);color:var(--text-muted)">' +
      '<i class="fa-solid fa-user"></i> ' + (inc.assignee || 'Unassigned') +
    '</span>';

  if (contentEl) {
    contentEl.textContent = inc.aiResponse || 'No AI analysis yet. Click "Re-analyze" for AI recommendations.';
  }
  if (thinkingEl) thinkingEl.style.display = 'none';
  if (modal) modal.classList.add('open');
}

async function analyzeWithAI() {
  if (!currentEditId) return;
  var inc = getIncidentById(currentEditId);
  if (!inc) return;
  var contentEl  = document.getElementById('ai-response-content');
  var thinkingEl = document.getElementById('ai-thinking');
  if (contentEl)  contentEl.textContent = 'Analyzing with AI agent...';
  if (thinkingEl) thinkingEl.style.display = 'flex';
  var resp = await analyzeIncidentAI(inc);
  if (contentEl)  contentEl.textContent = resp;
  if (thinkingEl) thinkingEl.style.display = 'none';
  showToast('🤖 AI analysis complete', 'success');
  renderGrid();
}

function resolveIncident() {
  if (!currentEditId) return;
  updateIncident(currentEditId, { status:'resolved' });
  closeDetailModal();
  showToast('✅ Incident resolved', 'success');
  refreshPage();
}

function deleteIncident() {
  if (!currentEditId) return;
  deleteIncidentById(currentEditId);
  closeDetailModal();
  showToast('🗑 Incident deleted', 'warning');
  refreshPage();
}

/* ── Init ── */
document.addEventListener('DOMContentLoaded', function() {
  refreshPage();
});