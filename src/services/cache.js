class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes
  }

  set(key, value, ttl = this.defaultTTL) {
    const item = {
      value,
      expiry: Date.now() + ttl,
    };
    this.cache.set(key, item);
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Cache with automatic invalidation
  async getOrSet(key, fetchFn, ttl = this.defaultTTL) {
    const cached = this.get(key);
    if (cached) return cached;

    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  // Cache with tags for group invalidation
  setWithTags(key, value, tags, ttl = this.defaultTTL) {
    const item = {
      value,
      expiry: Date.now() + ttl,
      tags: new Set(tags),
    };
    this.cache.set(key, item);
  }

  invalidateByTags(tags) {
    for (const [key, item] of this.cache.entries()) {
      if (tags.some(tag => item.tags.has(tag))) {
        this.cache.delete(key);
      }
    }
  }

  // Cache with automatic background refresh
  async getWithBackgroundRefresh(key, fetchFn, ttl = this.defaultTTL, refreshThreshold = 0.8) {
    const item = this.cache.get(key);
    const now = Date.now();

    if (!item) {
      const value = await fetchFn();
      this.set(key, value, ttl);
      return value;
    }

    if (now > item.expiry) {
      const value = await fetchFn();
      this.set(key, value, ttl);
      return value;
    }

    // If we're past the refresh threshold, trigger a background refresh
    if (now > item.expiry * refreshThreshold) {
      fetchFn().then(value => {
        this.set(key, value, ttl);
      });
    }

    return item.value;
  }

  // Cache with size limits
  setWithSizeLimit(key, value, maxSize = 100) {
    if (this.cache.size >= maxSize) {
      // Remove oldest item
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.set(key, value);
  }

  // Cache with priority
  setWithPriority(key, value, priority = 0, ttl = this.defaultTTL) {
    const item = {
      value,
      expiry: Date.now() + ttl,
      priority,
    };
    this.cache.set(key, item);
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    const stats = {
      totalItems: this.cache.size,
      expiredItems: 0,
      activeItems: 0,
      totalSize: 0,
    };

    for (const item of this.cache.values()) {
      if (now > item.expiry) {
        stats.expiredItems++;
      } else {
        stats.activeItems++;
      }
      stats.totalSize += JSON.stringify(item.value).length;
    }

    return stats;
  }
}

export const cache = new CacheService();
export default cache; 