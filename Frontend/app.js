// ============================================
// IRA - Frontend API Integration
// Connect to Flask Backend
// ============================================

const API_URL = 'http://localhost:5000/api';

// Then test the connection
async function testBackend() {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log('Backend status:', data);
}

fetch("http://localhost:3000/api/data")
.then(res => res.json())
.then(data => {
    console.log(data.message);
}); 
// ==================== INCIDENT API ====================

async function getIncidents() {
    try {
        const response = await fetch(`${API_URL}/incidents`);
        const data = await response.json();
        return data.incidents || [];
    } catch (error) {
        console.error('Error fetching incidents:', error);
        return [];
    }
}

async function getIncident(incidentId) {
    try {
        const response = await fetch(`${API_URL}/incidents/${incidentId}`);
        const data = await response.json();
        return data.incident;
    } catch (error) {
        console.error('Error fetching incident:', error);
        return null;
    }
}

async function createIncident(incidentData) {
    try {
        const response = await fetch(`${API_URL}/incidents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(incidentData)
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('Error creating incident:', error);
        return { success: false, error: error.message };
    }
}

async function updateIncident(incidentId, updates) {
    try {
        const response = await fetch(`${API_URL}/incidents/${incidentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updates)
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('Error updating incident:', error);
        return { success: false, error: error.message };
    }
}

async function deleteIncident(incidentId) {
    try {
        const response = await fetch(`${API_URL}/incidents/${incidentId}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('Error deleting incident:', error);
        return { success: false, error: error.message };
    }
}

async function resolveIncident(incidentId) {
    try {
        const response = await fetch(`${API_URL}/incidents/${incidentId}/resolve`, {
            method: 'POST'
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('Error resolving incident:', error);
        return { success: false, error: error.message };
    }
}

async function analyzeIncident(incidentId) {
    try {
        const response = await fetch(`${API_URL}/incidents/${incidentId}/analyze`, {
            method: 'POST'
        });
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('Error analyzing incident:', error);
        return { success: false, error: error.message };
    }
}

// ==================== STATS API ====================

async function getStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching stats:', error);
        return {
            total: 0,
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            resolved: 0,
            open: 0,
            in_progress: 0
        };
    }
}

async function getCharts() {
    try {
        const response = await fetch(`${API_URL}/charts`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching charts:', error);
        return {
            activity: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], data: [0, 0, 0, 0, 0, 0, 0] },
            severity: { critical: 0, high: 0, medium: 0, low: 0 }
        };
    }
}

// ==================== AI AGENT API ====================

async function sendChatMessage(message, incidentId = null) {
    try {
        const response = await fetch(`${API_URL}/agent/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message, incident_id: incidentId })
        });
        const data = await response.json();
        return { success: response.ok, response: data.response };
    } catch (error) {
        console.error('Error sending chat message:', error);
        return { success: false, error: error.message };
    }
}

// ==================== SEARCH API ====================

async function searchIncidents(query) {
    try {
        const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        return data.incidents || [];
    } catch (error) {
        console.error('Error searching incidents:', error);
        return [];
    }
}

// ==================== HEALTH CHECK ====================

async function checkBackendHealth() {
    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();
        console.log('Backend status:', data);
        return data.status === 'healthy';
    } catch (error) {
        console.error('Backend not reachable:', error);
        return false;
    }
}

// ==================== EXPORT FUNCTIONS ====================

window.API = {
    getIncidents,
    getIncident,
    createIncident,
    updateIncident,
    deleteIncident,
    resolveIncident,
    analyzeIncident,
    getStats,
    getCharts,
    sendChatMessage,
    searchIncidents,
    checkBackendHealth
};

// Check backend connection on load
document.addEventListener('DOMContentLoaded', async () => {
    const isHealthy = await checkBackendHealth();
    if (isHealthy) {
        console.log('✅ Connected to IRA Backend');
    } else {
        console.warn('⚠️ Could not connect to backend. Make sure server is running on http://localhost:5000');
    }
});