import { APP_CONSTANTS } from '../config/constants';

class AnalyticsService {
  constructor() {
    this.events = [];
    this.performanceMetrics = {};
    this.isInitialized = false;
  }

  initialize() {
    if (this.isInitialized) return;
    
    // Initialize performance monitoring
    this.initializePerformanceMonitoring();
    
    // Initialize error tracking
    this.initializeErrorTracking();
    
    this.isInitialized = true;
  }

  initializePerformanceMonitoring() {
    // Track page load performance
    if (window.performance) {
      const navigation = window.performance.getEntriesByType('navigation')[0];
      if (navigation) {
        this.performanceMetrics.pageLoad = {
          dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
          tcpConnection: navigation.connectEnd - navigation.connectStart,
          serverResponse: navigation.responseEnd - navigation.requestStart,
          domLoad: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          totalLoad: navigation.loadEventEnd - navigation.navigationStart,
        };
      }
    }

    // Track API response times
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const start = performance.now();
      try {
        const response = await originalFetch(...args);
        const duration = performance.now() - start;
        this.trackApiPerformance(args[0], duration, response.status);
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        this.trackApiPerformance(args[0], duration, 'error');
        throw error;
      }
    };
  }

  initializeErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackError('runtime', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError('promise', {
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
      });
    });
  }

  trackEvent(category, action, label = null, value = null) {
    const event = {
      timestamp: new Date().toISOString(),
      category,
      action,
      label,
      value,
    };
    this.events.push(event);
    this.sendToAnalytics(event);
  }

  trackError(type, error) {
    const errorEvent = {
      timestamp: new Date().toISOString(),
      type: 'error',
      errorType: type,
      ...error,
    };
    this.events.push(errorEvent);
    this.sendToAnalytics(errorEvent);
  }

  trackApiPerformance(url, duration, status) {
    const metric = {
      timestamp: new Date().toISOString(),
      type: 'api_performance',
      url: url.toString(),
      duration,
      status,
    };
    this.performanceMetrics.apiCalls = this.performanceMetrics.apiCalls || [];
    this.performanceMetrics.apiCalls.push(metric);
    this.sendToAnalytics(metric);
  }

  trackSocketEvent(event, data) {
    const socketEvent = {
      timestamp: new Date().toISOString(),
      type: 'socket_event',
      event,
      data,
    };
    this.events.push(socketEvent);
    this.sendToAnalytics(socketEvent);
  }

  trackAttackDetection(attack) {
    const attackEvent = {
      timestamp: new Date().toISOString(),
      type: 'attack_detection',
      ...attack,
    };
    this.events.push(attackEvent);
    this.sendToAnalytics(attackEvent);
  }

  async sendToAnalytics(data) {
    // In a production environment, you would send this data to your analytics service
    // For now, we'll just log it
    if (process.env.NODE_ENV === 'development') {
      console.log('Analytics Event:', data);
    }
    
    // Example of sending to a backend endpoint
    try {
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }

  getMetrics() {
    return {
      events: this.events,
      performance: this.performanceMetrics,
    };
  }
}

export const analytics = new AnalyticsService();
export default analytics; 