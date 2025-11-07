// backend/src/routes/batches.js
// Batch management API endpoints

const express = require('express');
const { v4: uuid } = require('uuid');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

const {
  getAllBatches,
  getBatchWithJobs,
  getBatchStats,
  updateBatchStatus,
} = require('../helpers/batch-helpers');

const router = express.Router();
const OUTPUT_PATH = process.env.OUTPUT_PATH || '/tmp/pipeline-output';

// GET /api/batches - List all batches with filtering/sorting
router.get('/', async (req, res) => {
  try {
    const {
      status,
      customer_prefix,
      sort_by = 'created_at',
      sort_order = 'DESC',
      limit = 50,
      offset = 0,
    } = req.query;

    const batches = await getAllBatches(global.db, {
      status,
      customerPrefix: customer_prefix,
      sortBy: sort_by,
      sortOrder: sort_order,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Count total for pagination
    const countResult = await global.db.query(
      'SELECT COUNT(*) as total FROM batches'
    );

    res.json({
      data: batches,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error('Error fetching batches:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/batches/stats - Batch statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getBatchStats(global.db);
    res.json(stats);
  } catch (err) {
    console.error('Error fetching batch stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/batches/:batch_id - Get batch with all its jobs
router.get('/:batch_id', async (req, res) => {
  try {
    const batch = await getBatchWithJobs(global.db, req.params.batch_id);

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    res.json(batch);
  } catch (err) {
    console.error('Error fetching batch:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/batches/:batch_id/download - Download entire batch as ZIP
router.get('/:batch_id/download', async (req, res) => {
  try {
    const { batch_id } = req.params;

    // Get batch and verify it exists
    const batch = await getBatchWithJobs(global.db, batch_id);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    if (!batch.jobs || batch.jobs.length === 0) {
      return res.status(404).json({ error: 'No completed jobs in this batch' });
    }

    const zipName = `${batch.base_directory_name}.zip`;

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${zipName}"`
    );

    // Create archive
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Pipe archive to response
    archive.pipe(res);

    // Add files from each job in the batch
    for (const job of batch.jobs) {
      if (job.status !== 'completed') {
        console.log(`Skipping job ${job.id} (status: ${job.status})`);
        continue;
      }

      const jobOutputDir = path.join(OUTPUT_PATH, job.id);

      // Check if job directory exists
      if (!fs.existsSync(jobOutputDir)) {
        console.log(`Job output directory not found: ${jobOutputDir}`);
        continue;
      }

      // Get all output files (exclude input_* files)
      const files = fs.readdirSync(jobOutputDir);
      const outputFiles = files.filter(f => !f.startsWith('input_'));

      // Add each file to the ZIP
      for (const file of outputFiles) {
        const filePath = path.join(jobOutputDir, file);
        archive.file(filePath, { name: `${file}` });
      }
    }

    // Finalize the archive
    await archive.finalize();
  } catch (err) {
    console.error('Error downloading batch:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// PATCH /api/batches/:batch_id/name - Update custom batch name
router.patch('/:batch_id/name', async (req, res) => {
  try {
    const { batch_id } = req.params;
    const { custom_name } = req.body;

    // Validate input
    if (!custom_name || typeof custom_name !== 'string') {
      return res.status(400).json({ error: 'custom_name is required and must be a string' });
    }

    if (custom_name.length > 255) {
      return res.status(400).json({ error: 'custom_name must be 255 characters or less' });
    }

    // Check if batch exists
    const checkResult = await global.db.query(
      'SELECT id FROM batches WHERE id = $1',
      [batch_id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Update batch name
    const result = await global.db.query(
      `UPDATE batches 
       SET custom_name = $1, name_customized = TRUE 
       WHERE id = $2 
       RETURNING *`,
      [custom_name.trim(), batch_id]
    );

    res.json({
      message: 'Batch name updated successfully',
      batch: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating batch name:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/batches/:batch_id/reset-name - Reset to auto-generated name
router.patch('/:batch_id/reset-name', async (req, res) => {
  try {
    const { batch_id } = req.params;

    // Check if batch exists
    const checkResult = await global.db.query(
      'SELECT id FROM batches WHERE id = $1',
      [batch_id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Reset custom name
    const result = await global.db.query(
      `UPDATE batches 
       SET custom_name = NULL, name_customized = FALSE 
       WHERE id = $1 
       RETURNING *`,
      [batch_id]
    );

    res.json({
      message: 'Batch name reset successfully',
      batch: result.rows[0],
    });
  } catch (err) {
    console.error('Error resetting batch name:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/batches/:batch_id - Delete batch and all its jobs
router.delete('/:batch_id', async (req, res) => {
  try {
    const { batch_id } = req.params;

    // Get batch to verify it exists
    const batch = await getBatchWithJobs(global.db, batch_id);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    // Delete jobs (triggers cascade delete via batch_id foreign key)
    await global.db.query('DELETE FROM jobs WHERE batch_id = $1', [batch_id]);

    // Delete batch
    await global.db.query('DELETE FROM batches WHERE id = $1', [batch_id]);

    // Delete output directories
    for (const job of batch.jobs) {
      const jobOutputDir = path.join(OUTPUT_PATH, job.id);
      if (fs.existsSync(jobOutputDir)) {
        await fs.remove(jobOutputDir);
      }
    }

    res.json({ message: 'Batch deleted successfully' });
  } catch (err) {
    console.error('Error deleting batch:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
