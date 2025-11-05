const express = require('express');
const { v4: uuid } = require('uuid');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const router = express.Router();

const OUTPUT_PATH = process.env.OUTPUT_PATH || '/tmp/pipeline-output';

// GET /api/jobs - List all jobs
router.get('/', async (req, res) => {
  try {
    const result = await global.db.query(`
      SELECT id, pipeline_id, status, created_at, updated_at, file_name 
      FROM jobs 
      ORDER BY created_at DESC 
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id - Get specific job details
router.get('/:id', async (req, res) => {
  try {
    const result = await global.db.query(
      'SELECT * FROM jobs WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id/download - Download job outputs as ZIP or single file
// FIX #5: Excludes input_* files from downloads
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await global.db.query('SELECT * FROM jobs WHERE id = $1', [id]);
    
    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const outputDir = path.join(OUTPUT_PATH, id);
    
    // Get all files and filter out input_* files
    const allFiles = fs.readdirSync(outputDir);
    const outputFiles = allFiles.filter(file => !file.startsWith('input_'));

    if (outputFiles.length === 0) {
      return res.status(404).json({ error: 'No output files found for this job' });
    }

    if (outputFiles.length === 1) {
      // Single file - download directly
      const filename = outputFiles[0];
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.sendFile(path.join(outputDir, filename));
    } else {
      // Multiple files - create ZIP
      const zipName = `job-${id.substring(0, 8)}.zip`;
      res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
      res.setHeader('Content-Type', 'application/zip');
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);
      
      outputFiles.forEach(file => {
        archive.file(path.join(outputDir, file), { name: file });
      });
      
      await archive.finalize();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs - Submit single job
router.post('/', async (req, res) => {
  const { pipeline_id, file_name, file_data } = req.body;
  const job_id = uuid();

  try {
    await global.db.query(
      `INSERT INTO jobs (id, pipeline_id, status, file_name, input_data) 
       VALUES ($1, $2, $3, $4, $5)`,
      [job_id, pipeline_id, 'queued', file_name, file_data]
    );

    await global.imageQueue.add('process-image', {
      job_id,
      pipeline_id,
      file_name,
      file_data,
    });

    res.status(201).json({ job_id, status: 'queued' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/batch - Submit multiple jobs at once
router.post('/batch', async (req, res) => {
  const { pipeline_id, files } = req.body;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'files must be a non-empty array' });
  }

  // Limit batch size to prevent overwhelming the queue
  if (files.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 files per batch' });
  }

  try {
    const jobIds = [];

    for (const file of files) {
      const { file_name, file_data } = file;
      const job_id = uuid();

      await global.db.query(
        `INSERT INTO jobs (id, pipeline_id, status, file_name, input_data) 
         VALUES ($1, $2, $3, $4, $5)`,
        [job_id, pipeline_id, 'queued', file_name, file_data]
      );

      await global.imageQueue.add('process-image', {
        job_id,
        pipeline_id,
        file_name,
        file_data,
      });

      jobIds.push(job_id);
    }

    res.status(201).json({
      batch_id: uuid(),
      job_count: jobIds.length,
      job_ids: jobIds,
      status: 'queued',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/stats - Real-time monitoring stats
router.get('/stats/dashboard', async (req, res) => {
  try {
    // Queue statistics
    const queueCounts = await global.imageQueue.getJobCounts();
    
    // Recent job stats from database
    const recentJobs = await global.db.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
      FROM jobs
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY status
    `);

    // Total jobs processed today
    const todayStats = await global.db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM jobs
      WHERE created_at >= CURRENT_DATE
    `);

    const statusBreakdown = {};
    recentJobs.rows.forEach(row => {
      statusBreakdown[row.status] = {
        count: parseInt(row.count),
        avg_duration: parseFloat(row.avg_duration_seconds) || 0,
      };
    });

    res.json({
      queue: {
        waiting: queueCounts.waiting || 0,
        active: queueCounts.active || 0,
        completed: queueCounts.completed || 0,
        failed: queueCounts.failed || 0,
      },
      recent_hour: statusBreakdown,
      today: {
        total: parseInt(todayStats.rows[0].total),
        completed: parseInt(todayStats.rows[0].completed),
        failed: parseInt(todayStats.rows[0].failed),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
