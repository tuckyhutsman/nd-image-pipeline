const express = require('express');
const { v4: uuid } = require('uuid');
const router = express.Router();

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

module.exports = router;
