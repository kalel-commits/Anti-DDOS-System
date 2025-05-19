// Create a worker pool
class WorkerPool {
  constructor(size = navigator.hardwareConcurrency || 4) {
    this.size = size;
    this.workers = [];
    this.queue = [];
    this.activeWorkers = new Set();
  }

  initialize() {
    for (let i = 0; i < this.size; i++) {
      const worker = new Worker(new URL('../workers/main.worker.js', import.meta.url));
      worker.onmessage = this.handleWorkerMessage.bind(this, worker);
      worker.onerror = this.handleWorkerError.bind(this, worker);
      this.workers.push(worker);
    }
  }

  handleWorkerMessage(worker, event) {
    const { id, result, error } = event.data;
    const task = this.queue.find(t => t.id === id);
    
    if (task) {
      if (error) {
        task.reject(error);
      } else {
        task.resolve(result);
      }
      
      this.activeWorkers.delete(worker);
      this.processQueue();
    }
  }

  handleWorkerError(worker, error) {
    console.error('Worker error:', error);
    this.activeWorkers.delete(worker);
    this.processQueue();
  }

  async executeTask(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: Date.now(),
        task,
        resolve,
        reject,
      });
      this.processQueue();
    });
  }

  processQueue() {
    const availableWorker = this.workers.find(w => !this.activeWorkers.has(w));
    if (availableWorker && this.queue.length > 0) {
      const { id, task } = this.queue.shift();
      this.activeWorkers.add(availableWorker);
      availableWorker.postMessage({ id, task });
    }
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.queue = [];
    this.activeWorkers.clear();
  }
}

// Create the worker file
const workerCode = `
self.onmessage = async function(e) {
  const { id, task } = e.data;
  
  try {
    let result;
    
    switch (task.type) {
      case 'analyzeAttack':
        result = await analyzeAttack(task.data);
        break;
      case 'processLogs':
        result = await processLogs(task.data);
        break;
      case 'calculateStats':
        result = await calculateStats(task.data);
        break;
      default:
        throw new Error('Unknown task type');
    }
    
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};

// Attack analysis function
async function analyzeAttack(data) {
  const { events, patterns } = data;
  
  // Perform pattern matching
  const matches = patterns.map(pattern => ({
    pattern: pattern.name,
    count: events.filter(event => 
      event.type === pattern.type && 
      event.severity >= pattern.minSeverity
    ).length
  }));
  
  // Calculate attack probability
  const totalEvents = events.length;
  const attackProbability = matches.reduce((acc, match) => 
    acc + (match.count / totalEvents), 0
  );
  
  return {
    matches,
    attackProbability,
    timestamp: new Date().toISOString()
  };
}

// Log processing function
async function processLogs(data) {
  const { logs, filters } = data;
  
  // Apply filters
  const filteredLogs = logs.filter(log => {
    return Object.entries(filters).every(([key, value]) => {
      if (Array.isArray(value)) {
        return value.includes(log[key]);
      }
      return log[key] === value;
    });
  });
  
  // Group by time intervals
  const groupedLogs = filteredLogs.reduce((acc, log) => {
    const timeKey = new Date(log.timestamp).toISOString().slice(0, 13);
    if (!acc[timeKey]) acc[timeKey] = [];
    acc[timeKey].push(log);
    return acc;
  }, {});
  
  return {
    totalLogs: filteredLogs.length,
    groupedLogs,
    timestamp: new Date().toISOString()
  };
}

// Statistics calculation function
async function calculateStats(data) {
  const { values, type } = data;
  
  let stats = {};
  
  switch (type) {
    case 'basic':
      stats = calculateBasicStats(values);
      break;
    case 'advanced':
      stats = calculateAdvancedStats(values);
      break;
    default:
      throw new Error('Unknown stats type');
  }
  
  return {
    ...stats,
    timestamp: new Date().toISOString()
  };
}

function calculateBasicStats(values) {
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  
  return {
    count: values.length,
    sum,
    mean,
    median,
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function calculateAdvancedStats(values) {
  const basic = calculateBasicStats(values);
  const variance = values.reduce((acc, val) => 
    acc + Math.pow(val - basic.mean, 2), 0
  ) / values.length;
  
  return {
    ...basic,
    variance,
    standardDeviation: Math.sqrt(variance),
    skewness: calculateSkewness(values, basic.mean, Math.sqrt(variance)),
    kurtosis: calculateKurtosis(values, basic.mean, Math.sqrt(variance))
  };
}

function calculateSkewness(values, mean, stdDev) {
  const n = values.length;
  const sum = values.reduce((acc, val) => 
    acc + Math.pow((val - mean) / stdDev, 3), 0
  );
  return (sum * n) / ((n - 1) * (n - 2));
}

function calculateKurtosis(values, mean, stdDev) {
  const n = values.length;
  const sum = values.reduce((acc, val) => 
    acc + Math.pow((val - mean) / stdDev, 4), 0
  );
  return (sum * n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)) - 
    (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
}
`;

// Create a blob URL for the worker code
const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
const workerUrl = URL.createObjectURL(workerBlob);

// Export the worker pool
export const workerPool = new WorkerPool();
workerPool.initialize();

export default workerPool; 