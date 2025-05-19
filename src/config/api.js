const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  BLOCKED_IPS: `${API_BASE_URL}/api/blocked-ips`,
  ATTACKS: `${API_BASE_URL}/api/attacks`,
  DASHBOARD_STATS: `${API_BASE_URL}/api/dashboard-stats`,
  ATTACKS_TIMELINE: `${API_BASE_URL}/api/attacks/timeline`,
  FIREWALL_RULES: `${API_BASE_URL}/api/firewall-rules`,
};

export const getApiUrl = (endpoint) => {
  return API_ENDPOINTS[endpoint] || `${API_BASE_URL}${endpoint}`;
}; 