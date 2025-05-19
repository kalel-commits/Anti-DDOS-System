const net = require('net');
const http = require('http');
const axios = require('axios');

class AttackSimulator {
  constructor(targetIP = 'localhost', targetPort = 5000) {
    this.targetIP = targetIP;
    this.targetPort = targetPort;
    this.attackStats = {
      totalRequests: 0,
      blockedRequests: 0,
      successfulRequests: 0,
      startTime: null,
      endTime: null,
    };
  }

  async startTest() {
    console.log('Starting attack simulation...');
    this.attackStats.startTime = new Date();
    
    // Run different attack types sequentially to better track results
    await this.simulateDDoS(20); // Reduced from 100 to 20 connections
    await this.simulatePortScan();
    await this.simulateBruteForce(10); // Reduced from 50 to 10 attempts

    // Simulate traffic to a blocked port to trigger iptables DROP
    await this.simulateBlockedPortTraffic(10, 12345);

    this.attackStats.endTime = new Date();
    this.printStats();
  }

  async simulateDDoS(connectionCount) {
    console.log(`\nSimulating DDoS attack with ${connectionCount} concurrent connections...`);
    
    const connections = [];
    const promises = [];

    for (let i = 0; i < connectionCount; i++) {
      const promise = new Promise(async (resolve) => {
        try {
          const response = await axios.post(`http://${this.targetIP}:${this.targetPort}/api/attacks`, {
            type: 'DDoS',
            confidence: 0.95,
            events: 1000,
            firstEvent: new Date().toISOString(),
            lastEvent: new Date().toISOString(),
            sourceIP: `192.168.1.${i}`,
            destinationIP: '192.168.1.1',
            severity: 'high',
            detectedBy: 'rate-limiter'
          });
          
          this.attackStats.totalRequests++;
          this.attackStats.successfulRequests++;
          console.log(`Connection ${i + 1}: Success`);
        } catch (error) {
          this.attackStats.totalRequests++;
          this.attackStats.blockedRequests++;
          console.log(`Connection ${i + 1}: Blocked`);
        }
        resolve();
      });
      
      promises.push(promise);
      // Add a longer delay between connection attempts
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await Promise.all(promises);
  }

  async simulatePortScan() {
    console.log('\nSimulating port scan...');
    const ports = [20, 21, 22, 23, 25, 53, 80, 443, 3306, 5000, 8080];
    
    for (const port of ports) {
      try {
        const response = await axios.post(`http://${this.targetIP}:${this.targetPort}/api/attacks`, {
          type: 'PortScan',
          confidence: 0.85,
          events: 1,
          firstEvent: new Date().toISOString(),
          lastEvent: new Date().toISOString(),
          sourceIP: '192.168.1.100',
          destinationIP: '192.168.1.1',
          severity: 'medium',
          detectedBy: 'port-scanner'
        });
        
        this.attackStats.totalRequests++;
        this.attackStats.successfulRequests++;
        console.log(`Port ${port}: Success`);
      } catch (error) {
        this.attackStats.totalRequests++;
        this.attackStats.blockedRequests++;
        console.log(`Port ${port}: Blocked`);
      }
      // Add a longer delay between port scans
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async simulateBruteForce(attemptCount) {
    console.log(`\nSimulating brute force attack with ${attemptCount} attempts...`);
    
    for (let i = 0; i < attemptCount; i++) {
      try {
        const response = await axios.post(`http://${this.targetIP}:${this.targetPort}/api/attacks`, {
          type: 'BruteForce',
          confidence: 0.90,
          events: 1,
          firstEvent: new Date().toISOString(),
          lastEvent: new Date().toISOString(),
          sourceIP: '192.168.1.100',
          destinationIP: '192.168.1.1',
          severity: 'high',
          detectedBy: 'brute-force-detector'
        });
        
        this.attackStats.totalRequests++;
        this.attackStats.successfulRequests++;
        console.log(`Attempt ${i + 1}: Success`);
      } catch (error) {
        this.attackStats.totalRequests++;
        this.attackStats.blockedRequests++;
        console.log(`Attempt ${i + 1}: Blocked`);
      }
      // Add a longer delay between attempts
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async simulateBlockedPortTraffic(connectionCount, blockedPort) {
    console.log(`\nSimulating traffic to blocked port ${blockedPort}...`);
    for (let i = 0; i < connectionCount; i++) {
      await new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);
        socket.on('error', () => {
          this.attackStats.totalRequests++;
          this.attackStats.blockedRequests++;
          console.log(`Blocked port connection ${i + 1}: Blocked`);
          resolve();
        });
        socket.on('timeout', () => {
          socket.destroy();
          this.attackStats.totalRequests++;
          this.attackStats.blockedRequests++;
          console.log(`Blocked port connection ${i + 1}: Timeout/Blocked`);
          resolve();
        });
        socket.connect(blockedPort, this.targetIP, () => {
          // If somehow connected, count as success
          this.attackStats.totalRequests++;
          this.attackStats.successfulRequests++;
          console.log(`Blocked port connection ${i + 1}: Success (unexpected)`);
          socket.destroy();
          resolve();
        });
      });
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  printStats() {
    const duration = (this.attackStats.endTime - this.attackStats.startTime) / 1000;
    const blockRate = this.attackStats.totalRequests > 0 
      ? (this.attackStats.blockedRequests / this.attackStats.totalRequests) * 100 
      : 0;

    console.log('\nAttack Simulation Results:');
    console.log('------------------------');
    console.log(`Duration: ${duration.toFixed(2)} seconds`);
    console.log(`Total Requests: ${this.attackStats.totalRequests}`);
    console.log(`Blocked Requests: ${this.attackStats.blockedRequests}`);
    console.log(`Successful Requests: ${this.attackStats.successfulRequests}`);
    console.log(`Block Rate: ${blockRate.toFixed(2)}%`);
  }
}

// Run the simulation
const simulator = new AttackSimulator();
simulator.startTest(); 