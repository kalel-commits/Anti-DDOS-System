export const RATE_LIMIT_CONFIG = {
  // API Rate Limits
  API: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: 'Too many requests, please try again later.',
  },
  
  // Socket Rate Limits
  SOCKET: {
    // Connection attempts
    connection: {
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 connection attempts per minute
    },
    // Event emission
    events: {
      windowMs: 60 * 1000, // 1 minute
      max: 100, // 100 events per minute
    },
  },
  
  // IP Blocking Thresholds
  IP_BLOCKING: {
    // Number of failed attempts before blocking
    maxFailedAttempts: 5,
    // Time window for failed attempts (in minutes)
    windowMinutes: 15,
    // Block duration (in hours)
    blockDuration: 24,
  },
};

export default RATE_LIMIT_CONFIG; 