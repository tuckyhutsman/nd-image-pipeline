const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const { Queue } = require('bullmq');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

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
global.imageQueue = new Queue('image-processing', {
  connection: {
    host: 'redis',
    port: 6379,
    maxRetriesPerRequest: null,
  },
});

app.use('/api/pipelines', require('./routes/pipelines'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/health', require('./routes/health'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

module.exports = app;
