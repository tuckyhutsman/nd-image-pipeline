const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // Support filtering by archived status and pipeline type
    const { archived, type } = req.query;
    
    let query = `
      SELECT 
        p.id, p.name, p.description, p.notes, p.config, p.is_active, p.archived, 
        p.is_template, p.is_protected, p.protection_reason, p.pipeline_type,
        p.archived_at, p.created_at, p.updated_at,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', pc.id,
            'pipeline_id', pc.component_pipeline_id,
            'pipeline_name', cp.name,
            'order_index', pc.order_index,
            'custom_suffix', pc.custom_suffix
          ) ORDER BY pc.order_index)
          FROM pipeline_components pc
          JOIN pipelines cp ON cp.id = pc.component_pipeline_id
          WHERE pc.parent_pipeline_id = p.id),
          '[]'::json
        ) as components
      FROM pipelines p
      WHERE p.is_active = true
    `;
    
    // Filter by archived status if specified
    if (archived === 'true') {
      query += ' AND p.archived = true';
    } else if (archived === 'false') {
      query += ' AND p.archived = false';
    }
    
    // Filter by pipeline type if specified
    if (type === 'single') {
      query += ' AND p.pipeline_type = \'single\'';
    } else if (type === 'multi-asset') {
      query += ' AND p.pipeline_type = \'multi-asset\'';
    }
    
    query += ' ORDER BY p.created_at DESC';
    
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
      `SELECT 
        p.*,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', pc.id,
            'pipeline_id', pc.component_pipeline_id,
            'pipeline_name', cp.name,
            'order_index', pc.order_index,
            'custom_suffix', pc.custom_suffix
          ) ORDER BY pc.order_index)
          FROM pipeline_components pc
          JOIN pipelines cp ON cp.id = pc.component_pipeline_id
          WHERE pc.parent_pipeline_id = p.id),
          '[]'::json
        ) as components
      FROM pipelines p
      WHERE p.id = $1`,
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
  const { name, description, notes, config, pipeline_type, components } = req.body;
  
  try {
    // Start transaction
    await global.db.query('BEGIN');
    
    // Create the pipeline
    const pipelineResult = await global.db.query(
      `INSERT INTO pipelines (name, description, notes, config, pipeline_type) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        name, 
        description || '', 
        notes || null,
        JSON.stringify(config || {}),
        pipeline_type || 'single'
      ]
    );
    
    const pipeline = pipelineResult.rows[0];
    
    // If multi-asset pipeline, add components
    if (pipeline_type === 'multi-asset' && components && components.length > 0) {
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        await global.db.query(
          `INSERT INTO pipeline_components 
           (parent_pipeline_id, component_pipeline_id, order_index, custom_suffix)
           VALUES ($1, $2, $3, $4)`,
          [pipeline.id, component.pipeline_id, i, component.custom_suffix || null]
        );
      }
    }
    
    await global.db.query('COMMIT');
    
    // Fetch the complete pipeline with components
    const finalResult = await global.db.query(
      `SELECT 
        p.*,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', pc.id,
            'pipeline_id', pc.component_pipeline_id,
            'pipeline_name', cp.name,
            'order_index', pc.order_index,
            'custom_suffix', pc.custom_suffix
          ) ORDER BY pc.order_index)
          FROM pipeline_components pc
          JOIN pipelines cp ON cp.id = pc.component_pipeline_id
          WHERE pc.parent_pipeline_id = p.id),
          '[]'::json
        ) as components
      FROM pipelines p
      WHERE p.id = $1`,
      [pipeline.id]
    );
    
    res.status(201).json(finalResult.rows[0]);
  } catch (err) {
    await global.db.query('ROLLBACK');
    console.error('Error creating pipeline:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, description, notes, config, components } = req.body;
  
  try {
    // Start transaction
    await global.db.query('BEGIN');
    
    // Check if pipeline exists and get its type
    const checkResult = await global.db.query(
      'SELECT pipeline_type FROM pipelines WHERE id = $1',
      [req.params.id]
    );
    
    if (checkResult.rows.length === 0) {
      await global.db.query('ROLLBACK');
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    const pipelineType = checkResult.rows[0].pipeline_type;
    
    // Update the pipeline
    const result = await global.db.query(
      `UPDATE pipelines 
       SET name = $1, description = $2, notes = $3, config = $4, updated_at = NOW() 
       WHERE id = $5 RETURNING *`,
      [name, description || '', notes || null, JSON.stringify(config), req.params.id]
    );
    
    // If multi-asset pipeline and components provided, update them
    if (pipelineType === 'multi-asset' && components) {
      // Delete existing components
      await global.db.query(
        'DELETE FROM pipeline_components WHERE parent_pipeline_id = $1',
        [req.params.id]
      );
      
      // Add new components
      for (let i = 0; i < components.length; i++) {
        const component = components[i];
        await global.db.query(
          `INSERT INTO pipeline_components 
           (parent_pipeline_id, component_pipeline_id, order_index, custom_suffix)
           VALUES ($1, $2, $3, $4)`,
          [req.params.id, component.pipeline_id, i, component.custom_suffix || null]
        );
      }
    }
    
    await global.db.query('COMMIT');
    
    // Fetch the complete pipeline with components
    const finalResult = await global.db.query(
      `SELECT 
        p.*,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', pc.id,
            'pipeline_id', pc.component_pipeline_id,
            'pipeline_name', cp.name,
            'order_index', pc.order_index,
            'custom_suffix', pc.custom_suffix
          ) ORDER BY pc.order_index)
          FROM pipeline_components pc
          JOIN pipelines cp ON cp.id = pc.component_pipeline_id
          WHERE pc.parent_pipeline_id = p.id),
          '[]'::json
        ) as components
      FROM pipelines p
      WHERE p.id = $1`,
      [req.params.id]
    );
    
    res.json(finalResult.rows[0]);
  } catch (err) {
    await global.db.query('ROLLBACK');
    console.error('Error updating pipeline:', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    // Check if pipeline is protected (template or referenced by multi-asset pipelines)
    const checkResult = await global.db.query(
      'SELECT is_template, is_protected, protection_reason, name FROM pipelines WHERE id = $1',
      [req.params.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    const pipeline = checkResult.rows[0];
    
    if (pipeline.is_protected) {
      return res.status(403).json({ 
        error: 'Cannot delete protected pipeline',
        message: `"${pipeline.name}" is protected: ${pipeline.protection_reason}`
      });
    }
    
    const result = await global.db.query(
      'DELETE FROM pipelines WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    
    res.json({ message: 'Pipeline deleted' });
  } catch (err) {
    console.error('Error deleting pipeline:', err);
    
    // Check if it's a foreign key constraint error
    if (err.code === '23503') {
      return res.status(403).json({ 
        error: 'Cannot delete pipeline',
        message: 'This pipeline is referenced by one or more multi-asset pipelines and cannot be deleted.'
      });
    }
    
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/pipelines/:id/archive - Archive a pipeline
router.patch('/:id/archive', async (req, res) => {
  try {
    // Check if pipeline is protected
    const checkResult = await global.db.query(
      'SELECT is_protected, protection_reason, name FROM pipelines WHERE id = $1',
      [req.params.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Pipeline not found' });
    }
    
    const pipeline = checkResult.rows[0];
    
    if (pipeline.is_protected) {
      return res.status(403).json({ 
        error: 'Cannot archive protected pipeline',
        message: `"${pipeline.name}" is protected: ${pipeline.protection_reason}`
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

// GET /api/pipelines/:id/components - Get components for a multi-asset pipeline
router.get('/:id/components', async (req, res) => {
  try {
    const result = await global.db.query(
      `SELECT 
        pc.id,
        pc.parent_pipeline_id,
        pc.component_pipeline_id,
        pc.order_index,
        pc.custom_suffix,
        pc.created_at,
        p.name as pipeline_name,
        p.description as pipeline_description,
        p.config as pipeline_config
      FROM pipeline_components pc
      JOIN pipelines p ON p.id = pc.component_pipeline_id
      WHERE pc.parent_pipeline_id = $1
      ORDER BY pc.order_index`,
      [req.params.id]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching pipeline components:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
