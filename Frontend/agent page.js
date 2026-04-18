// ========================================
// IRA - AI AGENT JAVASCRIPT
// ========================================

// Incident Data
const incidents = [
    { id: 'INC-001', title: 'Database connection timeout', severity: 'critical', status: 'open', category: 'database', description: 'Production database connection pool exhausted causing timeout errors for 15 minutes' },
    { id: 'INC-002', title: 'API latency spike', severity: 'high', status: 'in-progress', category: 'application', description: 'API response times increased from 200ms to 4500ms during peak hours' },
    { id: 'INC-003', title: 'SSL certificate expiring', severity: 'medium', status: 'open', category: 'security', description: 'SSL cert for api.example.com expires in 3 days, auto-renewal failed' },
    { id: 'INC-004', title: 'Memory leak in payment service', severity: 'high', status: 'in-progress', category: 'application', description: 'Payment service memory usage growing unboundedly, restarted 3 times' },
    { id: 'INC-005', title: 'CDN latency in APAC region', severity: 'medium', status: 'open', category: 'network', description: 'Users in Asia experiencing 3x normal latency' },
    { id: 'INC-006', title: 'Failed login attempts from suspicious IPs', severity: 'critical', status: 'open', category: 'security', description: '150 failed login attempts from 5 IP ranges in last 30 min' }
];

let selectedIncident = null;
let isTyping = false;

// Initialize page
function init() {
    renderIncidentList();
    updateTime();
    setInterval(updateTime, 1000);
    
    // Add welcome message if chat is empty
    const container = document.getElementById('chatMessages');
    if (container && container.children.length === 0) {
        addWelcomeMessage();
    }
}

// Update live time
function updateTime() {
    const timeEl = document.getElementById('liveTime');
    if (timeEl) {
        timeEl.textContent = new Date().toLocaleTimeString();
    }
}

// Render incident list
function renderIncidentList() {
    const container = document.getElementById('incidentList');
    const openIncidents = incidents.filter(i => i.status !== 'resolved');
    
    const countEl = document.getElementById('incidentCount');
    const navCount = document.getElementById('navCount');
    
    if (countEl) countEl.textContent = openIncidents.length;
    if (navCount) navCount.textContent = openIncidents.length;
    
    if (openIncidents.length === 0) {
        container.innerHTML = '<div class="empty-state">✨ No open incidents</div>';
        return;
    }
    
    container.innerHTML = openIncidents.map(inc => `
        <div class="incident-item ${selectedIncident?.id === inc.id ? 'selected' : ''}" 
             onclick="selectIncident('${inc.id}')">
            <div class="incident-title">${escapeHtml(inc.title)}</div>
            <div class="incident-meta">
                <span class="badge badge-${inc.severity}">${inc.severity}</span>
                <span style="color:#4e5a6e">${inc.id}</span>
            </div>
        </div>
    `).join('');
}

// Select incident
function selectIncident(id) {
    selectedIncident = incidents.find(i => i.id === id);
    renderIncidentList();
    
    addBotMessage(`✅ **Selected: ${selectedIncident.id} - ${selectedIncident.title}**\n\n` +
        `**Severity:** ${selectedIncident.severity.toUpperCase()}\n` +
        `**Status:** ${selectedIncident.status}\n` +
        `**Category:** ${selectedIncident.category}\n\n` +
        `How can I help? Try asking for:\n` +
        `• "root cause" - Why did this happen?\n` +
        `• "remediation" - How to fix it?\n` +
        `• "report" - Generate detailed report`);
}

// Send message
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();
    
    if (!message || isTyping) return;
    
    input.value = '';
    input.style.height = 'auto';
    
    addUserMessage(message);
    setTyping(true);
    
    const response = await generateResponse(message);
    setTyping(false);
    addBotMessage(response);
}

// Generate AI response
async function generateResponse(message) {
    const lower = message.toLowerCase();
    await new Promise(r => setTimeout(r, 800));
    
    // Critical incidents
    if (lower.includes('critical')) {
        const critical = incidents.filter(i => i.severity === 'critical' && i.status !== 'resolved');
        if (critical.length === 0) {
            return "✅ **No Critical Incidents**\n\nAll critical issues are resolved. Great job! 🎉";
        }
        return `🚨 **Critical Incidents (${critical.length})**\n\n${critical.map(i => `• **${i.id}**: ${i.title}\n  Status: ${i.status} | Category: ${i.category}`).join('\n\n')}\n\n⚠️ These require immediate attention. Select one to analyze further.`;
    }
    
    // Root cause
    if ((lower.includes('root cause') || lower.includes('why')) && selectedIncident) {
        return getRootCauseAnalysis(selectedIncident);
    }
    
    // Remediation
    if ((lower.includes('remediation') || lower.includes('fix') || lower.includes('resolve')) && selectedIncident) {
        return getRemediationSteps(selectedIncident);
    }
    
    // Report
    if (lower.includes('report') || lower.includes('summary')) {
        if (selectedIncident) {
            return generateIncidentReport(selectedIncident);
        }
        return generateOverallReport();
    }
    
    // Help
    if (lower.includes('help')) {
        return getHelpMessage();
    }
    
    // Greeting
    if (lower.includes('hello') || lower.includes('hi')) {
        return "👋 **Hello!** I'm your IRA AI Agent. Select an incident from the left panel or ask me about critical issues, root causes, or remediation plans.\n\nType `help` to see all commands.";
    }
    
    // No incident selected
    if (!selectedIncident) {
        return "⚠️ **No Incident Selected**\n\nPlease select an incident from the left panel first.\n\n**Try these commands:**\n• `critical` - Show critical incidents\n• `report` - Generate summary report\n• `help` - See all commands";
    }
    
    return `📋 **About ${selectedIncident.id}: ${selectedIncident.title}**\n\nWhat would you like to know? Try:\n• "root cause" - Why did this happen?\n• "remediation" - How to fix it?\n• "report" - Generate detailed report`;
}

// Root cause analysis
function getRootCauseAnalysis(incident) {
    const analyses = {
        database: `🔍 **Root Cause Analysis - ${incident.id}**\n\n**Likely Causes:**\n1. Connection pool exhaustion\n2. Long-running queries\n3. Resource saturation\n\n**Confidence:** High (87%)\n\n**Next Steps:** Check \`SHOW PROCESSLIST\` and monitoring metrics.`,
        application: `🔍 **Root Cause Analysis - ${incident.id}**\n\n**Likely Causes:**\n1. Memory leak\n2. Unbounded cache\n3. Event listener leak\n\n**Confidence:** High (84%)\n\n**Next Steps:** Take heap snapshot and review recent code changes.`,
        security: `🔍 **Root Cause Analysis - ${incident.id}**\n\n**Likely Causes:**\n1. Credential stuffing attack\n2. Weak rate limiting\n3. Missing account lockout\n\n**Confidence:** Very High (94%)\n\n**Next Steps:** Block IP ranges and enable MFA.`,
        network: `🔍 **Root Cause Analysis - ${incident.id}**\n\n**Likely Causes:**\n1. BGP route flap\n2. CDN overload\n3. ISP peering issue\n\n**Confidence:** Medium (71%)\n\n**Next Steps:** Run traceroute and check provider status.`
    };
    return analyses[incident.category] || `🔍 **Root Cause Analysis - ${incident.id}**\n\n**Likely Cause:** Recent deployment or configuration change.\n\n**Next Steps:** Review deployment logs and system metrics.`;
}

// Remediation steps
function getRemediationSteps(incident) {
    return `🛠️ **Remediation Plan - ${incident.id}**\n\n**Immediate Actions:**\n1. Verify impact scope\n2. Notify stakeholders\n3. Implement mitigation\n\n**Technical Steps:**\n• Check error logs\n• Restart affected services\n• Scale resources if needed\n\n**Post-Resolution:**\n• Document root cause\n• Update runbook\n• Schedule post-mortem\n\n⏱️ **Estimated Time:** 30-45 minutes`;
}

// Generate incident report
function generateIncidentReport(incident) {
    return `📋 **Incident Report - ${incident.id}**\n\n` +
        `**Title:** ${incident.title}\n` +
        `**Severity:** ${incident.severity.toUpperCase()}\n` +
        `**Status:** ${incident.status}\n` +
        `**Category:** ${incident.category}\n\n` +
        `**Description:**\n${incident.description}\n\n` +
        `**Next Steps:**\n` +
        `1. Assign to on-call engineer\n` +
        `2. Schedule post-mortem within 48 hours\n` +
        `3. Update documentation\n\n` +
        `*Report generated at ${new Date().toLocaleString()}*`;
}

// Generate overall report
function generateOverallReport() {
    const total = incidents.length;
    const resolved = incidents.filter(i => i.status === 'resolved').length;
    const open = incidents.filter(i => i.status === 'open').length;
    const inProgress = incidents.filter(i => i.status === 'in-progress').length;
    
    return `📊 **Overall Summary Report**\n\n` +
        `**Current Status:**\n` +
        `• Total Incidents: ${total}\n` +
        `• Open: ${open}\n` +
        `• In Progress: ${inProgress}\n` +
        `• Resolved: ${resolved}\n\n` +
        `**Resolution Rate:** ${Math.round((resolved/total)*100)}%\n\n` +
        `Select an incident for detailed analysis.`;
}

// Help message
function getHelpMessage() {
    return `📚 **Available Commands**\n\n` +
        `• \`critical\` - Show critical incidents\n` +
        `• \`report\` - Generate summary report\n` +
        `• \`help\` - Show this help\n\n` +
        `**With incident selected:**\n` +
        `• \`root cause\` - Why it happened\n` +
        `• \`remediation\` - How to fix it\n` +
        `• \`report\` - Detailed report`;
}

// Add welcome message
function addWelcomeMessage() {
    addBotMessage(`👋 **Hello! I'm the IRA AI Agent** — your intelligent incident response assistant.\n\n` +
        `I can help you:\n` +
        `• 🔍 Analyze incidents and find root causes\n` +
        `• 🛠️ Suggest remediation steps\n` +
        `• 📊 Generate incident reports\n` +
        `• ⚡ Prioritize critical issues\n\n` +
        `**Select an incident from the left panel or type your question below.**`);
}

// Add user message
function addUserMessage(text) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'message user';
    div.innerHTML = `
        <div class="message-avatar user-avatar">
            <i class="fas fa-user"></i>
        </div>
        <div class="message-bubble">
            ${escapeHtml(text)}
            <span class="message-time">${new Date().toLocaleTimeString()}</span>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

// Add bot message
function addBotMessage(text) {
    const container = document.getElementById('chatMessages');
    const div = document.createElement('div');
    div.className = 'message';
    div.innerHTML = `
        <div class="message-avatar bot-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-bubble">
            ${formatMessage(text)}
            <span class="message-time">${new Date().toLocaleTimeString()}</span>
        </div>
    `;
    container.appendChild(div);
    scrollToBottom();
}

// Format message
function formatMessage(text) {
    let formatted = escapeHtml(text);
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
}

// Set typing indicator
function setTyping(active) {
    isTyping = active;
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.style.display = active ? 'flex' : 'none';
    }
    if (active) scrollToBottom();
}

// Scroll to bottom
function scrollToBottom() {
    const container = document.getElementById('chatMessages');
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 50);
}

// Handle Enter key
function handleKey(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Auto-resize textarea
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Quick actions
function askCritical() {
    document.getElementById('messageInput').value = 'Show me critical incidents';
    sendMessage();
}

function askRootCause() {
    if (selectedIncident) {
        document.getElementById('messageInput').value = `What is the root cause of ${selectedIncident.id}?`;
    } else {
        document.getElementById('messageInput').value = 'Show me critical incidents';
    }
    sendMessage();
}

function askRemediation() {
    if (selectedIncident) {
        document.getElementById('messageInput').value = `Show remediation steps for ${selectedIncident.id}`;
    } else {
        document.getElementById('messageInput').value = 'Show me critical incidents';
    }
    sendMessage();
}

function askReport() {
    if (selectedIncident) {
        document.getElementById('messageInput').value = `Generate report for ${selectedIncident.id}`;
    } else {
        document.getElementById('messageInput').value = 'Generate overall incident report';
    }
    sendMessage();
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);