const express = require('express');
const { v4: uuid } = require('uuid');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const {
  createBatch,
  calculateTotalSize,
} = require('../helpers/batch-helpers');

const router = express.Router();

const OUTPUT_PATH = process.env.OUTPUT_PATH || '/tmp/pipeline-output';

// GET /api/jobs - List all jobs grouped by batch
router.get('/', async (req, res) => {
  try {
    const result = await global.db.query(`
      SELECT 
        b.id as batch_id,
        b.base_directory_name,
        b.render_description,
        b.customer_prefix,
        b.status as batch_status,
        b.total_files,
        b.created_at as batch_created_at,
        COUNT(j.id) as job_count,
        COUNT(CASE WHEN j.status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN j.status = 'failed' THEN 1 END) as failed_count
      FROM batches b
      LEFT JOIN jobs j ON b.id = j.batch_id
      GROUP BY b.id
      ORDER BY b.created_at DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/batch/:batch_id - Get all jobs in a batch
router.get('/batch/:batch_id', async (req, res) => {
  try {
    const result = await global.db.query(
      `SELECT id, pipeline_id, status, input_filename, created_at, started_at, completed_at, failed_at
       FROM jobs 
       WHERE batch_id = $1 
       ORDER BY created_at ASC`,
      [req.params.batch_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching batch jobs:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:id - Delete individual job
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get job info before deleting
    const jobResult = await global.db.query('SELECT * FROM jobs WHERE id = $1', [id]);
    
    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobResult.rows[0];

    // Delete job from database (this will update batch counts via trigger)
    await global.db.query('DELETE FROM jobs WHERE id = $1', [id]);

    // Delete output files
    const outputDir = path.join(OUTPUT_PATH, id);
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    res.json({ message: 'Job deleted successfully', job_id: id });
  } catch (err) {
    console.error('Error deleting job:', err);
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
    console.error('Error fetching job:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper: Map format type to file extension
const getExtensionForFormat = (formatType) => {
  const extensionMap = {
    'png': '.png',
    'png8': '.png',
    'jpeg': '.jpg',
    'jpg': '.jpg',
    'webp': '.webp',
    'tiff': '.tiff',
    'tif': '.tiff',
  };
  return extensionMap[formatType] || '.jpg';
};

// Helper: Generate proper output filename
const generateProperFileName = (inputFile, suffix, format) => {
  const inputBase = inputFile.replace(/\.[^.]+$/, '');
  const ext = getExtensionForFormat(format);
  return `${inputBase}${suffix}${ext}`;
};

// Helper: Format Content-Disposition header properly
const formatContentDisposition = (filename, isAttachment = true) => {
  const safeName = filename.replace(/"/g, '\\"');
  const type = isAttachment ? 'attachment' : 'inline';
  const encodedName = encodeURIComponent(filename);
  return `${type}; filename="${safeName}"; filename*=UTF-8''${encodedName}`;
};

// GET /api/jobs/:id/download - Download job outputs
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const jobResult = await global.db.query('SELECT * FROM jobs WHERE id = $1', [id]);
    
    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobResult.rows[0];
    const inputFileName = job.input_filename;
    
    console.log(`[DOWNLOAD] Job ID: ${id}, Input file: ${inputFileName}, Pipeline ID: ${job.pipeline_id}`);
    
    // Get pipeline config
    let pipelineConfig = {};
    try {
      const pipelineResult = await global.db.query(
        'SELECT config FROM pipelines WHERE id = $1',
        [job.pipeline_id]
      );
      
      if (pipelineResult.rows.length > 0) {
        pipelineConfig = typeof pipelineResult.rows[0].config === 'string' 
          ? JSON.parse(pipelineResult.rows[0].config) 
          : pipelineResult.rows[0].config;
      }
    } catch (err) {
      console.error(`[DOWNLOAD] Error fetching pipeline config:`, err.message);
    }

    const outputDir = path.join(OUTPUT_PATH, id);
    
    // Get all files and filter out input_* files
    const allFiles = fs.readdirSync(outputDir);
    const outputFiles = allFiles.filter(file => !file.startsWith('input_'));

    if (outputFiles.length === 0) {
      return res.status(404).json({ error: 'No output files found for this job' });
    }

    if (outputFiles.length === 1) {
      // Single file download
      const format = pipelineConfig?.format?.type || 'jpeg';
      const suffix = pipelineConfig?.suffix || '';
      const properFileName = generateProperFileName(inputFileName, suffix, format);
      
      res.setHeader('Content-Disposition', formatContentDisposition(properFileName));
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.sendFile(path.join(outputDir, outputFiles[0]));
    } else {
      // Multiple files - create ZIP
      const format = pipelineConfig?.format?.type || 'jpeg';
      const suffix = pipelineConfig?.suffix || '';
      const zipName = `job-${id.substring(0, 8)}.zip`;
      
      res.setHeader('Content-Disposition', formatContentDisposition(zipName));
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);
      
      outputFiles.forEach(file => {
        const properFileName = generateProperFileName(inputFileName, suffix, format);
        archive.file(path.join(outputDir, file), { name: properFileName });
      });
      
      await archive.finalize();
    }
  } catch (err) {
    console.error(`[DOWNLOAD] Error:`, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs - Submit single job (creates or joins batch)
router.post('/', async (req, res) => {
  const { pipeline_id, file_name, file_data, batch_description } = req.body;
  const job_id = uuid();

  try {
    // Create batch for single job submission
    let batchId;
    try {
      const batch = await createBatch(global.db, {
        filenames: [file_name],
        renderDescription: batch_description,
        pipelineId: pipeline_id,
        totalSize: file_data ? Math.ceil(file_data.length * 0.75) : 0,
      });
      batchId = batch.id;
      console.log(`Created batch ${batchId} for single job`);
    } catch (batchErr) {
      console.error('Error creating batch:', batchErr);
      return res.status(400).json({ error: `Batch creation failed: ${batchErr.message}` });
    }

    // Create job tied to batch - FIXED: use input_filename and input_base64
    await global.db.query(
      `INSERT INTO jobs (id, batch_id, pipeline_id, status, input_filename, input_base64) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [job_id, batchId, pipeline_id, 'queued', file_name, file_data]
    );

    // Queue the job
    await global.imageQueue.add('process-image', {
      job_id,
      pipeline_id,
      file_name,
      file_data,
    });

    res.status(201).json({ 
      job_id, 
      batch_id: batchId,
      status: 'queued' 
    });
  } catch (err) {
    console.error('Error submitting job:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs/batch - Submit multiple jobs at once (creates batch)
router.post('/batch', async (req, res) => {
  const { pipeline_id, files, batch_description } = req.body;

  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'files must be a non-empty array' });
  }

  if (files.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 files per batch' });
  }

  try {
    // Create batch
    const filenames = files.map(f => f.file_name);
    const totalSize = calculateTotalSize(files);

    let batch;
    try {
      batch = await createBatch(global.db, {
        filenames,
        renderDescription: batch_description,
        pipelineId: pipeline_id,
        totalSize,
      });
      console.log(`Created batch ${batch.id} with ${files.length} files`);
    } catch (batchErr) {
      console.error('Error creating batch:', batchErr);
      return res.status(400).json({ error: `Batch creation failed: ${batchErr.message}` });
    }

    // Create jobs for all files - FIXED: use input_filename and input_base64
    const jobIds = [];
    for (const file of files) {
      const { file_name, file_data } = file;
      const job_id = uuid();

      await global.db.query(
        `INSERT INTO jobs (id, batch_id, pipeline_id, status, input_filename, input_base64) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [job_id, batch.id, pipeline_id, 'queued', file_name, file_data]
      );

      // Queue the job
      await global.imageQueue.add('process-image', {
        job_id,
        pipeline_id,
        file_name,
        file_data,
      });

      jobIds.push(job_id);
    }

    res.status(201).json({
      batch_id: batch.id,
      base_directory_name: batch.base_directory_name,
      job_count: jobIds.length,
      job_ids: jobIds,
      status: 'queued',
    });
  } catch (err) {
    console.error('Error submitting batch:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/stats/dashboard - Real-time monitoring stats
router.get('/stats/dashboard', async (req, res) => {
  try {
    // Queue statistics
    const queueCounts = await global.imageQueue.getJobCounts();
    
    // Recent job stats from database
    const recentJobs = await global.db.query(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, failed_at, NOW()) - created_at))) as avg_duration_seconds
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
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
