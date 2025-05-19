import axios from 'axios';
import { getApiUrl } from '../config/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: getApiUrl(''),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // You can add auth token here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMessage = error.response?.data?.message || error.message;
    return Promise.reject(new Error(errorMessage));
  }
);

// API methods
export const apiService = {
  // Blocked IPs
  getBlockedIPs: () => api.get(getApiUrl('BLOCKED_IPS')),
  unblockIP: (ip) => api.delete(`${getApiUrl('BLOCKED_IPS')}/${ip}`),
  
  // Attacks
  getAttacks: (params) => api.get(getApiUrl('ATTACKS'), { params }),
  getAttackDetails: (id) => api.get(`${getApiUrl('ATTACKS')}/${id}`),
  
  // Dashboard
  getDashboardStats: () => api.get(getApiUrl('DASHBOARD_STATS')),
  getAttacksTimeline: (params) => api.get(getApiUrl('ATTACKS_TIMELINE'), { params }),
  
  // Firewall Rules
  getFirewallRules: () => api.get(getApiUrl('FIREWALL_RULES')),
  updateFirewallRule: (id, data) => api.put(`${getApiUrl('FIREWALL_RULES')}/${id}`, data),
  createFirewallRule: (data) => api.post(getApiUrl('FIREWALL_RULES'), data),
  deleteFirewallRule: (id) => api.delete(`${getApiUrl('FIREWALL_RULES')}/${id}`),
};

export default apiService; 