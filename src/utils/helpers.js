import dayjs from 'dayjs';
import { APP_CONSTANTS } from '../config/constants';

// Date formatting
export const formatDate = (date, format = APP_CONSTANTS.UI.DATE_FORMAT) => {
  return dayjs(date).format(format);
};

// IP address validation
export const isValidIP = (ip) => {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;
  
  const octets = ip.split('.');
  return octets.every(octet => {
    const num = parseInt(octet);
    return num >= 0 && num <= 255;
  });
};

// Severity level formatting
export const formatSeverity = (severity) => {
  const severityMap = {
    [APP_CONSTANTS.SEVERITY_LEVELS.LOW]: { color: 'success', label: 'Low' },
    [APP_CONSTANTS.SEVERITY_LEVELS.MEDIUM]: { color: 'warning', label: 'Medium' },
    [APP_CONSTANTS.SEVERITY_LEVELS.HIGH]: { color: 'error', label: 'High' },
    [APP_CONSTANTS.SEVERITY_LEVELS.CRITICAL]: { color: 'error', label: 'Critical' },
  };
  
  return severityMap[severity] || { color: 'default', label: severity };
};

// Attack type formatting
export const formatAttackType = (type) => {
  const typeMap = {
    [APP_CONSTANTS.ATTACK_TYPES.DDOS]: 'DDoS Attack',
    [APP_CONSTANTS.ATTACK_TYPES.BRUTE_FORCE]: 'Brute Force',
    [APP_CONSTANTS.ATTACK_TYPES.PORT_SCAN]: 'Port Scan',
    [APP_CONSTANTS.ATTACK_TYPES.SQL_INJECTION]: 'SQL Injection',
    [APP_CONSTANTS.ATTACK_TYPES.XSS]: 'XSS Attack',
    [APP_CONSTANTS.ATTACK_TYPES.OTHER]: 'Other',
  };
  
  return typeMap[type] || type;
};

// Error handling
export const handleError = (error, defaultMessage = APP_CONSTANTS.ERROR_MESSAGES.API_ERROR) => {
  console.error('Error:', error);
  return error?.message || defaultMessage;
};

// Data formatting for charts
export const formatChartData = (data, xKey, yKey) => {
  return data.map(item => ({
    x: item[xKey],
    y: item[yKey],
  }));
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export default {
  formatDate,
  isValidIP,
  formatSeverity,
  formatAttackType,
  handleError,
  formatChartData,
  debounce,
  throttle,
}; 