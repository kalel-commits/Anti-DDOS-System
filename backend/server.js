const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const { logAttack, getAllAttacks, getDashboardStats, getAttackTimeline } = require('./models/sqliteLogger');
const dayjs = require('dayjs');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests, please try again later.',
});
app.use(limiter);

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// In-memory store for blocked IPs (replace with database in production)
const blockedIPs = new Map();

// Socket.IO handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Send current blocked IPs to newly connected client
  socket.emit('blocked_ips_update', Array.from(blockedIPs.entries()));

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    serverTime: new Date(),
    database: 'sqlite',
    blockedIPsCount: blockedIPs.size
  });
});

// Enhanced iptables management functions
const IPTABLES_RULES = {
  INPUT: {
    default: '-P INPUT DROP',
    established: '-A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT',
    localhost: '-A INPUT -i lo -j ACCEPT',
    icmp: '-A INPUT -p icmp --icmp-type echo-request -m limit --limit 1/s -j ACCEPT',
    ssh: '-A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set',
    sshLimit: '-A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 -j DROP',
    http: '-A INPUT -p tcp --dport 80 -j ACCEPT',
    https: '-A INPUT -p tcp --dport 443 -j ACCEPT',
    custom: '-A INPUT -p tcp --dport 5000 -j ACCEPT' // Your app port
  },
  FORWARD: {
    default: '-P FORWARD DROP',
    established: '-A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT'
  },
  OUTPUT: {
    default: '-P OUTPUT ACCEPT'
  }
};

// Function to initialize iptables with secure defaults
async function initializeIptables() {
  try {
    // Check if sudo is available
    const { stdout: sudoCheck } = await executeCommand('which sudo');
    if (!sudoCheck) {
      console.log('Sudo not available, running without iptables functionality');
      return;
    }

    // Flush existing rules
    await executeCommand('sudo iptables -F');
    await executeCommand('sudo iptables -X');
    await executeCommand('sudo iptables -Z');

    // Set default policies
    for (const [chain, rules] of Object.entries(IPTABLES_RULES)) {
      await executeCommand(`sudo iptables ${rules.default}`);
      
      // Apply chain-specific rules
      for (const [ruleName, rule] of Object.entries(rules)) {
        if (ruleName !== 'default') {
          await executeCommand(`sudo iptables ${rule}`);
        }
      }
    }

    // Enable stateful packet inspection
    await executeCommand('sudo iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT');
    
    // Save rules to persist across reboots
    await executeCommand('sudo sh -c "iptables-save > /etc/iptables/rules.v4"');
    
    console.log('Iptables initialized successfully');
  } catch (error) {
    console.error('Error initializing iptables:', error);
    console.log('Continuing without iptables functionality');
  }
}

// Enhanced blockIP function with stateful inspection
async function blockIP(ip) {
  if (!ip || typeof ip !== 'string') {
    throw new Error('Invalid IP address');
  }

  // Validate IP format
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) {
    throw new Error('Invalid IP format');
  }

  // Validate octets
  const octets = ip.split('.');
  const isValidOctet = octets.every(octet => {
    const num = parseInt(octet);
    return num >= 0 && num <= 255;
  });
  
  if (!isValidOctet) {
    throw new Error('Invalid IP octet values');
  }

  try {
    // Check if sudo is available
    const { stdout: sudoCheck } = await executeCommand('which sudo');
    if (!sudoCheck) {
      console.log('Sudo not available, using in-memory blocking only');
      // Update memory store
      blockedIPs.set(ip, {
        blockedAt: new Date().toISOString(),
        blockedBy: 'system',
        status: 'blocked'
      });

      // Notify clients
      io.emit('ip_blocked', {
        ip,
        blockedAt: blockedIPs.get(ip).blockedAt,
        status: 'blocked'
      });

      return 'IP blocked in memory (iptables not available)';
    }

    // Check if IP is already blocked
    const checkCmd = `sudo iptables -C INPUT -s ${ip} -j DROP 2>/dev/null || echo "Rule does not exist"`;
    const { stdout: checkResult } = await executeCommand(checkCmd);

    if (!checkResult.includes("Rule does not exist")) {
      return 'IP already blocked';
    }

    // Block IP with stateful inspection
    const blockCommands = [
      `sudo iptables -A INPUT -s ${ip} -m state --state NEW -j DROP`,
      `sudo iptables -A FORWARD -s ${ip} -j DROP`,
      `sudo iptables -A OUTPUT -d ${ip} -j DROP`
    ];

    for (const cmd of blockCommands) {
      await executeCommand(cmd);
    }

    // Save rules
    await executeCommand('sudo sh -c "iptables-save > /etc/iptables/rules.v4"');

    // Update memory store
    blockedIPs.set(ip, {
      blockedAt: new Date().toISOString(),
      blockedBy: 'system',
      status: 'blocked'
    });

    // Notify clients
    io.emit('ip_blocked', {
      ip,
      blockedAt: blockedIPs.get(ip).blockedAt,
      status: 'blocked'
    });

    return 'IP blocked successfully';
  } catch (error) {
    console.error('Error blocking IP:', error);
    throw error;
  }
}

// Enhanced unblockIP function
async function unblockIP(ip) {
  if (!ip || typeof ip !== 'string') {
    throw new Error('Invalid IP address');
  }

  try {
    // Check if sudo is available
    const { stdout: sudoCheck } = await executeCommand('which sudo');
    if (!sudoCheck) {
      console.log('Sudo not available, using in-memory unblocking only');
      // Remove from memory store
      blockedIPs.delete(ip);

      // Notify clients
      io.emit('ip_unblocked', {
        ip,
        unblockedAt: new Date().toISOString(),
        status: 'unblocked'
      });

      return 'IP unblocked from memory (iptables not available)';
    }

    const unblockCommands = [
      `sudo iptables -D INPUT -s ${ip} -m state --state NEW -j DROP`,
      `sudo iptables -D FORWARD -s ${ip} -j DROP`,
      `sudo iptables -D OUTPUT -d ${ip} -j DROP`
    ];

    for (const cmd of unblockCommands) {
      await executeCommand(cmd);
    }

    // Save rules
    await executeCommand('sudo sh -c "iptables-save > /etc/iptables/rules.v4"');

    // Remove from memory store
    blockedIPs.delete(ip);

    // Notify clients
    io.emit('ip_unblocked', {
      ip,
      unblockedAt: new Date().toISOString(),
      status: 'unblocked'
    });

    return 'IP unblocked successfully';
  } catch (error) {
    console.error('Error unblocking IP:', error);
    throw error;
  }
}

// Utility function to execute commands with proper error handling
function executeCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command execution error: ${error.message}`);
        console.error(`Command: ${cmd}`);
        console.error(`Stderr: ${stderr}`);
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
}

// GET all blocked IPs
app.get('/api/blocked-ips', (req, res) => {
  const ipsArray = Array.from(blockedIPs.entries()).map(([ip, data]) => ({
    address: ip,
    ...data
  }));
  res.json(ipsArray);
});

// POST block new IP
app.post('/api/blocked-ips', (req, res) => {
  console.log('Received request to block IP:', req.body);
  const { ip } = req.body;
  
  if (!ip) {
    console.error('No IP provided in request');
    return res.status(400).json({ 
      error: 'IP address is required',
      details: 'Please provide an IP address in the request body'
    });
  }

  blockIP(ip)
    .then((result) => {
      console.log('Successfully blocked IP:', ip, result);
      res.status(201).json({ 
        message: 'IP blocked successfully',
        ip,
        blockedAt: blockedIPs.get(ip).blockedAt,
        status: blockedIPs.get(ip).status
      });
    })
    .catch(err => {
      console.error('Error in /api/blocked-ips POST:', {
        error: err.message,
        stack: err.stack,
        ip: ip
      });
      res.status(500).json({ 
        error: 'Failed to block IP',
        details: err.message || 'Unknown error occurred'
      });
    });
});

// DELETE unblock IP
app.delete('/api/blocked-ips/:ip', (req, res) => {
  const { ip } = req.params;

  if (!ip) {
    return res.status(400).json({ 
      error: 'IP address is required',
      details: 'Please provide an IP address in the URL parameter'
    });
  }

  unblockIP(ip)
    .then(() => {
      res.json({ 
        message: 'IP unblocked successfully',
        ip
      });
    })
    .catch(err => {
      console.error('Error unblocking IP:', err);
      res.status(500).json({ 
        error: 'Failed to unblock IP',
        details: err.message || 'Unknown error occurred'
      });
    });
});

// GET all attacks
app.get('/api/attacks', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  getAllAttacks(offset, limit, (err, result) => {
    if (err) {
      console.error('Error fetching attacks:', err);
      return res.status(500).json({ message: 'Failed to fetch attacks' });
    }
    res.json({
      attacks: result.attacks,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit)
    });
  });
});

// GET dashboard stats
app.get('/api/dashboard-stats', (req, res) => {
  getDashboardStats((err, stats) => {
    if (err) {
      console.error('Error fetching dashboard stats:', err);
      return res.status(500).json({ message: 'Failed to fetch dashboard statistics' });
    }
    res.json(stats);
  });
});

// GET attack timeline
app.get('/api/attacks/timeline', (req, res) => {
  getAttackTimeline((err, timelineData) => {
    if (err) {
      console.error('Error fetching timeline data:', err);
      return res.status(500).json({ message: 'Failed to fetch timeline data' });
    }
    res.json(timelineData);
  });
});

// POST new attack with iptables block
app.post('/api/attacks', async (req, res) => {
  try {
    const {
      type,
      confidence,
      events,
      firstEvent,
      lastEvent,
      sourceIP,
      destinationIP,
      severity,
      detectedBy
    } = req.body;

    console.log('Received attack data:', req.body);

    const attackData = {
      type,
      confidence,
      events,
      firstEvent,
      lastEvent,
      sourceIP,
      destinationIP,
      severity,
      detectedBy,
      timestamp: new Date().toISOString()
    };

    try {
      const attackId = await logAttack(attackData);
      console.log('Attack logged successfully with ID:', attackId);
      
      io.emit('new_attack', attackData);

      // Block the source IP using iptables if severity is high
      if (severity === 'high' || severity === 'critical') {
        console.log('Attempting to block IP:', sourceIP);
        await blockIP(sourceIP);
      }

      console.log('Attack processing completed');
      res.status(201).json({ 
        message: 'Attack logged' + (attackData.severity === 'high' || attackData.severity === 'critical' ? ' and source IP blocked' : ''),
        data: attackData 
      });
    } catch (error) {
      console.error('Error processing attack:', {
        error: error.message,
        stack: error.stack,
        attackData: attackData
      });
      res.status(500).json({ 
        message: 'Failed to log attack' + (attackData.severity === 'high' || attackData.severity === 'critical' ? ' or block IP' : ''),
        error: error.message,
        details: error.stack
      });
    }
  } catch (error) {
    console.error('Error in /api/attacks POST:', error);
    res.status(500).json({ 
      message: 'Invalid request',
      error: error.message,
      details: error.stack
    });
  }
});

// DELETE attack by ID placeholder
app.delete('/api/attacks/:id', (req, res) => {
  const { id } = req.params;
  res.status(200).json({ message: 'Attack deleted successfully', id });
});

// PUT update attack by ID placeholder
app.put('/api/attacks/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  res.status(200).json({ message: 'Attack updated successfully', id, data: updateData });
});

// Add a new endpoint to list current iptables rules
app.get('/api/firewall-rules', (req, res) => {
  const cmd = 'sudo iptables -L INPUT -n';
  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('Error listing firewall rules:', error);
      return res.status(500).json({ 
        error: 'Failed to list firewall rules',
        details: error.message
      });
    }
    res.json({ rules: stdout });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log('Running in demo mode without iptables functionality');
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please try these steps:`);
    console.error('1. Find the process using the port:');
    console.error('   netstat -ano | findstr :5000');
    console.error('2. Kill the process:');
    console.error('   taskkill /F /PID <PID>');
    console.error('Or kill all Node.js processes:');
    console.error('   taskkill /F /IM node.exe');
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});