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
// ISSUE #2 FIX: Format filename as {input_base}{suffix}.{extension}
const generateProperFileName = (inputFile, suffix, format) => {
  // Remove extension from input filename
  const inputBase = inputFile.replace(/\.[^.]+$/, '');
  // Get extension for format
  const ext = getExtensionForFormat(format);
  // Construct: basename + suffix + extension
  return `${inputBase}${suffix}${ext}`;
};

// Helper: Format Content-Disposition header properly
// RFC 6266 compliant with UTF-8 and special character handling
const formatContentDisposition = (filename, isAttachment = true) => {
  // Escape special characters for Content-Disposition
  const safeName = filename.replace(/"/g, '\\"');
  const type = isAttachment ? 'attachment' : 'inline';
  
  // Use filename*= for UTF-8 encoding (RFC 5987)
  // and filename= for backward compatibility
  const encodedName = encodeURIComponent(filename);
  return `${type}; filename="${safeName}"; filename*=UTF-8''${encodedName}`;
};

// GET /api/jobs/:id/download - Download job outputs as ZIP or single file
// FIX #5: Excludes input_* files from downloads
// ISSUE #2 FIX: Proper file naming with input name + pipeline suffix + format extension
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;
    const jobResult = await global.db.query('SELECT * FROM jobs WHERE id = $1', [id]);
    
    if (jobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobResult.rows[0];
    const inputFileName = job.file_name; // e.g., "photo.png"
    
    console.log(`[DOWNLOAD] Job ID: ${id}, Input file: ${inputFileName}, Pipeline ID: ${job.pipeline_id}`);
    
    // Get pipeline config to extract suffix and format
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
        console.log(`[DOWNLOAD] Pipeline config found:`, JSON.stringify(pipelineConfig).substring(0, 200));
      } else {
        console.log(`[DOWNLOAD] No pipeline config found for ID ${job.pipeline_id}`);
      }
    } catch (err) {
      console.error(`[DOWNLOAD] Error fetching pipeline config:`, err.message);
    }

    const outputDir = path.join(OUTPUT_PATH, id);
    
    // Get all files and filter out input_* files
    const allFiles = fs.readdirSync(outputDir);
    const outputFiles = allFiles.filter(file => !file.startsWith('input_'));

    console.log(`[DOWNLOAD] Output files:`, outputFiles);

    if (outputFiles.length === 0) {
      return res.status(404).json({ error: 'No output files found for this job' });
    }

    if (outputFiles.length === 1) {
      // Single file - download directly with proper name
      const format = pipelineConfig?.format?.type || 'jpeg';
      const suffix = pipelineConfig?.suffix || '';
      const properFileName = generateProperFileName(inputFileName, suffix, format);
      
      console.log(`[DOWNLOAD] Single file: format="${format}", suffix="${suffix}", properFileName="${properFileName}"`);
      
      // Set proper headers for download
      res.setHeader('Content-Disposition', formatContentDisposition(properFileName));
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.sendFile(path.join(outputDir, outputFiles[0]));
    } else {
      // Multiple files - create ZIP with proper individual names
      const format = pipelineConfig?.format?.type || 'jpeg';
      const suffix = pipelineConfig?.suffix || '';
      const zipName = `job-${id.substring(0, 8)}.zip`;
      
      console.log(`[DOWNLOAD] Multiple files (${outputFiles.length}): format="${format}", suffix="${suffix}"`);
      
      res.setHeader('Content-Disposition', formatContentDisposition(zipName));
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);
      
      outputFiles.forEach(file => {
        // For each file, use proper naming
        const properFileName = generateProperFileName(inputFileName, suffix, format);
        console.log(`[DOWNLOAD] Adding to ZIP: ${file} -> ${properFileName}`);
        archive.file(path.join(outputDir, file), { name: properFileName });
      });
      
      await archive.finalize();
    }
  } catch (err) {
    console.error(`[DOWNLOAD] Error:`, err);
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
