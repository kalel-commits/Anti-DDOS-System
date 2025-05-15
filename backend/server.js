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
    origin: 'http://localhost:3000',
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

// Socket.IO handling
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    serverTime: new Date(),
    database: 'sqlite'
  });
});

// Function to block IP using iptables
function blockIP(ip) {
  if (!ip || typeof ip !== 'string') {
    console.error('Invalid IP address');
    return Promise.reject('Invalid IP address');
  }

  const cmd = `sudo iptables -A INPUT -s ${ip} -j DROP`;

  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error blocking IP ${ip}:`, error.message);
        return reject(error);
      }
      if (stderr) {
        console.error(`iptables stderr: ${stderr}`);
      }
      console.log(`IP ${ip} blocked successfully.`);
      resolve(stdout);
    });
  });
}

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
app.post('/api/attacks', (req, res) => {
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

  logAttack(attackData)
    .then(() => {
      io.emit('new_attack', attackData);

      // Block the source IP using iptables
      return blockIP(sourceIP);
    })
    .then(() => {
      res.status(201).json({ message: 'Attack logged and source IP blocked', data: attackData });
    })
    .catch(err => {
      console.error('Error:', err);
      res.status(500).json({ message: 'Failed to log attack or block IP' });
    });
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

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
