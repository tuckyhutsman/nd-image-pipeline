const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await global.db.query(`
      SELECT id, name, customer_id, config, created_at, updated_at 
      FROM pipelines 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await global.db.query(
      'SELECT * FROM pipelines WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, customer_id, config } = req.body;
  try {
    const result = await global.db.query(
      `INSERT INTO pipelines (name, customer_id, config) 
       VALUES ($1, $2, $3) RETURNING *`,
      [name, customer_id || 'default', JSON.stringify(config)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, config } = req.body;
  try {
    const result = await global.db.query(
      `UPDATE pipelines SET name = $1, config = $2, updated_at = NOW() 
       WHERE id = $3 RETURNING *`,
      [name, JSON.stringify(config), req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await global.db.query(
      'DELETE FROM pipelines WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    res.json({ message: 'Pipeline deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
