const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const http = require('http'); // For creating server
const { Server } = require('socket.io'); // For real-time connection

const app = express();
const server = http.createServer(app); // Create a raw server instance
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Allow frontend origin
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Rate limiting (optional)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});
// app.use(limiter); // Uncomment in production

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/ddosdb', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB...'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// Attack schema and model
const attackSchema = new mongoose.Schema({
  type: { type: String, required: true },
  confidence: { type: String },
  events: { type: Number },
  firstEvent: { type: Date },
  lastEvent: { type: Date },
  time: { type: Date, default: Date.now }
});
const Attack = mongoose.model('Attack', attackSchema);

// Socket.IO events
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Health check
app.get('/api/health', async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    serverTime: new Date(),
    mongoDB: mongoStatus
  });
});

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// GET - Fetch all attacks
app.get('/api/attacks', async (req, res) => {
  const { type, confidence } = req.query;
  const filter = {};

  if (type) filter.type = type;
  if (confidence) filter.confidence = confidence;

  try {
    const attacks = await Attack.find(filter);
    res.json(attacks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST - Create new attack and broadcast
app.post('/api/attacks', async (req, res) => {
  const { type, confidence, events, firstEvent, lastEvent } = req.body;

  const attack = new Attack({
    type,
    confidence,
    events,
    firstEvent,
    lastEvent
  });

  try {
    const newAttack = await attack.save();

    // Emit to all clients in real-time
    io.emit('new_attack', newAttack);

    res.status(201).json(newAttack);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT - Update attack
app.put('/api/attacks/:id', async (req, res) => {
  try {
    const updatedAttack = await Attack.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedAttack) {
      return res.status(404).json({ message: 'Attack not found' });
    }
    res.json(updatedAttack);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE - Remove attack
app.delete('/api/attacks/:id', async (req, res) => {
  try {
    const attack = await Attack.findByIdAndDelete(req.params.id);
    if (!attack) {
      return res.status(404).json({ message: 'Attack not found' });
    }
    res.json({ message: 'Attack deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
