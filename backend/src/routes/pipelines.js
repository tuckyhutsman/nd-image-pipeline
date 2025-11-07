const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Support filtering by archived status
    const { archived } = req.query;
    
    let query = `
      SELECT id, name, description, config, is_active, archived, is_template, archived_at, created_at, updated_at 
      FROM pipelines 
      WHERE is_active = true
    `;
    
    // Filter by archived status if specified
    if (archived === 'true') {
      query += ' AND archived = true';
    } else if (archived === 'false') {
      query += ' AND archived = false';
    }
    // If archived not specified, show all (active and archived)
    
    query += ' ORDER BY created_at DESC';
    
    const result = await global.db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pipelines:', err);
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
    console.error('Error fetching pipeline:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { name, description, config } = req.body;
  try {
    const result = await global.db.query(
      `INSERT INTO pipelines (name, description, config) 
       VALUES ($1, $2, $3) RETURNING *`,
      [name, description || '', JSON.stringify(config)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating pipeline:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, description, config } = req.body;
  try {
    const result = await global.db.query(
      `UPDATE pipelines 
       SET name = $1, description = $2, config = $3, updated_at = NOW() 
       WHERE id = $4 RETURNING *`,
      [name, description || '', JSON.stringify(config), req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating pipeline:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    // Check if pipeline is a protected template
    const checkResult = await global.db.query(
      'SELECT is_template, name FROM pipelines WHERE id = $1',
      [req.params.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    if (checkResult.rows[0].is_template) {
      return res.status(403).json({ 
        error: 'Cannot delete template pipeline',
        message: `"${checkResult.rows[0].name}" is a protected template and cannot be deleted.`
      });
    }
    
    const result = await global.db.query(
      'DELETE FROM pipelines WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    res.json({ message: 'Pipeline deleted' });
  } catch (err) {
    console.error('Error deleting pipeline:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/pipelines/:id/archive - Archive a pipeline
router.patch('/:id/archive', async (req, res) => {
  try {
    // Check if pipeline is a protected template
    const checkResult = await global.db.query(
      'SELECT is_template, name FROM pipelines WHERE id = $1',
      [req.params.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    if (checkResult.rows[0].is_template) {
      return res.status(403).json({ 
        error: 'Cannot archive template pipeline',
        message: `"${checkResult.rows[0].name}" is a protected template and cannot be archived.`
      });
    }
    
    const result = await global.db.query(
      `UPDATE pipelines 
       SET archived = true, archived_at = NOW(), updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error archiving pipeline:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/pipelines/:id/unarchive - Unarchive a pipeline
router.patch('/:id/unarchive', async (req, res) => {
  try {
    const result = await global.db.query(
      `UPDATE pipelines 
       SET archived = false, archived_at = NULL, updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error unarchiving pipeline:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
