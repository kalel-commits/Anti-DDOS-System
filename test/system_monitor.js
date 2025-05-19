const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SystemMonitor {
  constructor(interval = 1000) {
    this.interval = interval;
    this.metrics = [];
    this.isMonitoring = false;
  }

  async startMonitoring() {
    console.log('Starting system monitoring...');
    this.isMonitoring = true;
    
    while (this.isMonitoring) {
      const metrics = await this.collectMetrics();
      this.metrics.push(metrics);
      this.printMetrics(metrics);
      await new Promise(resolve => setTimeout(resolve, this.interval));
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;
    this.printSummary();
  }

  async collectMetrics() {
    const timestamp = new Date().toISOString();
    
    // CPU Usage
    const cpuUsage = os.loadavg();
    
    // Memory Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Network Connections
    const { stdout: netstatOutput } = await execAsync('netstat -an | grep ESTABLISHED | wc -l');
    const activeConnections = parseInt(netstatOutput.trim());
    
    // Iptables Rules Count
    const { stdout: iptablesOutput } = await execAsync('sudo iptables -L INPUT -n | wc -l');
    const iptablesRules = parseInt(iptablesOutput.trim()) - 2; // Subtract header lines
    
    return {
      timestamp,
      cpu: {
        load1: cpuUsage[0],
        load5: cpuUsage[1],
        load15: cpuUsage[2],
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usagePercent: (usedMem / totalMem) * 100,
      },
      network: {
        activeConnections,
      },
      firewall: {
        iptablesRules,
      },
    };
  }

  printMetrics(metrics) {
    console.clear();
    console.log('System Metrics:');
    console.log('--------------');
    console.log(`Time: ${metrics.timestamp}`);
    console.log('\nCPU Load:');
    console.log(`1 min: ${metrics.cpu.load1.toFixed(2)}`);
    console.log(`5 min: ${metrics.cpu.load5.toFixed(2)}`);
    console.log(`15 min: ${metrics.cpu.load15.toFixed(2)}`);
    
    console.log('\nMemory Usage:');
    console.log(`Used: ${(metrics.memory.used / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Free: ${(metrics.memory.free / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Usage: ${metrics.memory.usagePercent.toFixed(2)}%`);
    
    console.log('\nNetwork:');
    console.log(`Active Connections: ${metrics.network.activeConnections}`);
    
    console.log('\nFirewall:');
    console.log(`Iptables Rules: ${metrics.firewall.iptablesRules}`);
  }

  printSummary() {
    if (this.metrics.length === 0) return;

    const firstMetric = this.metrics[0];
    const lastMetric = this.metrics[this.metrics.length - 1];
    
    console.log('\nMonitoring Summary:');
    console.log('------------------');
    console.log(`Duration: ${(new Date(lastMetric.timestamp) - new Date(firstMetric.timestamp)) / 1000} seconds`);
    
    console.log('\nCPU Load Change:');
    console.log(`1 min: ${firstMetric.cpu.load1.toFixed(2)} -> ${lastMetric.cpu.load1.toFixed(2)}`);
    console.log(`5 min: ${firstMetric.cpu.load5.toFixed(2)} -> ${lastMetric.cpu.load5.toFixed(2)}`);
    console.log(`15 min: ${firstMetric.cpu.load15.toFixed(2)} -> ${lastMetric.cpu.load15.toFixed(2)}`);
    
    console.log('\nMemory Usage Change:');
    console.log(`Usage: ${firstMetric.memory.usagePercent.toFixed(2)}% -> ${lastMetric.memory.usagePercent.toFixed(2)}%`);
    
    console.log('\nNetwork Change:');
    console.log(`Active Connections: ${firstMetric.network.activeConnections} -> ${lastMetric.network.activeConnections}`);
    
    console.log('\nFirewall Change:');
    console.log(`Iptables Rules: ${firstMetric.firewall.iptablesRules} -> ${lastMetric.firewall.iptablesRules}`);
  }
}

// Run the monitor
const monitor = new SystemMonitor();
monitor.startMonitoring();

// Stop monitoring after 5 minutes
setTimeout(() => {
  monitor.stopMonitoring();
}, 5 * 60 * 1000); 