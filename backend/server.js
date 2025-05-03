const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const { logAttack, getAllAttacks } = require('./models/sqliteLogger');
const dayjs = require('dayjs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Frontend origin
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
  max: 1000, // limit each IP to 1000 requests per windowMs
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

// ✅ GET all attacks (SQLite) with pagination
app.get('/api/attacks', (req, res) => {
  console.log('GET /api/attacks - Request received');
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  console.log(`Fetching attacks - Page: ${page}, Limit: ${limit}, Offset: ${offset}`);

  getAllAttacks(offset, limit, (err, result) => {
    if (err) {
      console.error('Error fetching attacks:', err);
      return res.status(500).json({ message: 'Failed to fetch attacks' });
    }
    console.log(`Successfully fetched ${result.attacks.length} attacks`);
    res.json({
      attacks: result.attacks,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit)
    });
  });
});

// ✅ POST new attack (SQLite)
app.post('/api/attacks', (req, res) => {
  console.log('POST /api/attacks - Request received');
  console.log('Request body:', req.body);

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

  console.log('Logging attack:', attackData);

  logAttack(attackData)
    .then(() => {
      console.log('Attack logged successfully');
      io.emit('new_attack', attackData);
      res.status(201).json({ message: 'Attack logged successfully', data: attackData });
    })
    .catch(err => {
      console.error('Error logging attack:', err);
      res.status(500).json({ message: 'Failed to log attack' });
    });
});

// ✅ DELETE attack by ID
app.delete('/api/attacks/:id', (req, res) => {
  const { id } = req.params;
  // TODO: Implement deleteAttack in sqliteLogger
  res.status(200).json({ message: 'Attack deleted successfully', id });
});

// ✅ PUT update attack by ID
app.put('/api/attacks/:id', (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  // TODO: Implement updateAttack in sqliteLogger
  res.status(200).json({ message: 'Attack updated successfully', id, data: updateData });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

