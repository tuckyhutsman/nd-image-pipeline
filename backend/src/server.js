const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const { Queue } = require('bullmq');
const redis = require('redis');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.REACT_APP_API_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1gb' }));
app.use(express.urlencoded({ limit: '1gb' }));

// Fix: Database connection with proper defaults
const db = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});

// Fix: Single Redis URL constant - CRITICAL
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

console.log('Starting API...');
console.log(`Redis URL: ${REDIS_URL}`);
console.log(`Database: ${process.env.DB_NAME}`);

const redisClient = redis.createClient({
  url: REDIS_URL,
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect().then(() => console.log('Redis connected'));

global.db = db;
global.redis = redisClient;
global.io = io;
global.imageQueue = new Queue('image-processing', {
  connection: {
    host: 'redis',
    port: 6379,
    maxRetriesPerRequest: null,
  },
});

// Routes
app.use('/api/pipelines', require('./routes/pipelines'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/health', require('./routes/health'));

// Socket.io connection for real-time updates
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Client joins monitoring room
  socket.on('join-monitoring', () => {
    socket.join('monitoring');
    console.log(`${socket.id} joined monitoring room`);
  });

  socket.on('watch-job', (jobId) => {
    socket.join(`job-${jobId}`);
    console.log(`${socket.id} watching job ${jobId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Emit job updates to connected clients
global.emitJobUpdate = (jobId, status, data) => {
  io.to(`job-${jobId}`).emit('job-update', { job_id: jobId, status, ...data });
  io.to('monitoring').emit('job-status-change', { job_id: jobId, status });
};

global.emitQueueStats = (stats) => {
  io.to('monitoring').emit('queue-stats', stats);
};

// Emit queue stats every 5 seconds to monitoring clients
setInterval(async () => {
  try {
    const queueCounts = await global.imageQueue.getJobCounts();
    global.emitQueueStats({
      waiting: queueCounts.waiting || 0,
      active: queueCounts.active || 0,
      completed: queueCounts.completed || 0,
      failed: queueCounts.failed || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error emitting queue stats:', err);
  }
}, 5000);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

server.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

module.exports = app;