export const APP_CONSTANTS = {
  // Socket Events
  SOCKET_EVENTS: {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ERROR: 'error',
    RECONNECT: 'reconnect',
    RECONNECT_ATTEMPT: 'reconnect_attempt',
    RECONNECT_ERROR: 'reconnect_error',
    RECONNECT_FAILED: 'reconnect_failed',
    NEW_ATTACK: 'new_attack',
    IP_BLOCKED: 'ip_blocked',
    IP_UNBLOCKED: 'ip_unblocked',
    BLOCKED_IPS_UPDATE: 'blocked_ips_update',
  },

  // Attack Severity Levels
  SEVERITY_LEVELS: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  },

  // Attack Types
  ATTACK_TYPES: {
    DDOS: 'ddos',
    BRUTE_FORCE: 'brute_force',
    PORT_SCAN: 'port_scan',
    SQL_INJECTION: 'sql_injection',
    XSS: 'xss',
    OTHER: 'other',
  },

  // Time Intervals (in milliseconds)
  INTERVALS: {
    REFRESH_DASHBOARD: 30000, // 30 seconds
    CHECK_CONNECTION: 5000,   // 5 seconds
    RECONNECT_DELAY: 1000,    // 1 second
  },

  // UI Constants
  UI: {
    MAX_TABLE_ROWS: 20,
    DATE_FORMAT: 'YYYY-MM-DD HH:mm:ss',
    TOAST_DURATION: 5000, // 5 seconds
  },

  // Error Messages
  ERROR_MESSAGES: {
    SOCKET_CONNECTION: 'Unable to connect to server',
    API_ERROR: 'An error occurred while fetching data',
    INVALID_IP: 'Invalid IP address format',
    UNAUTHORIZED: 'Unauthorized access',
    SERVER_ERROR: 'Internal server error',
  },
};

export default APP_CONSTANTS; 