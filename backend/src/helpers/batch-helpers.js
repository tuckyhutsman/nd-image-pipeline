// backend/src/helpers/batch-helpers.js
// Helper functions for batch grouping and management

const { v4: uuid } = require('uuid');

/**
 * Extract customer prefix from filenames
 * Examples:
 *   "PL-DXB191_GI_Defense_V1_SF102_Front.png" -> "PL_DXB"
 *   "PL_ABC123_Product_Name_View.jpg" -> "PL_ABC"
 */
function extractCustomerPrefix(filenames) {
  if (!filenames || filenames.length === 0) return null;

  // Take first filename and extract prefix
  const firstFile = filenames[0];
  
  // Match pattern: "PL" (or similar) followed by underscore/hyphen, then alphanumerics
  // Stops at next underscore or hyphen
  // E.g., "PL-DXB191" or "PL_ABC"
  const match = firstFile.match(/^([A-Z]+[_-][A-Z0-9]+?)(?:[_-]|\.)/);
  
  if (match) {
    // Normalize hyphens to underscores and take first 20 chars
    return match[1].replace('-', '_').substring(0, 20);
  }

  return null;
}

/**
 * Get next batch counter for a given customer/date combination
 * Queries existing batches to find max counter and returns next
 */
async function getNextBatchCounter(db, customerPrefix, batchDate) {
  try {
    const result = await db.query(
      `SELECT MAX(batch_counter) as max_counter 
       FROM batches 
       WHERE customer_prefix = $1 AND batch_date = $2`,
      [customerPrefix, batchDate]
    );

    const maxCounter = result.rows[0].max_counter || 0;
    return maxCounter + 1;
  } catch (err) {
    console.error('Error getting batch counter:', err);
    return 1;
  }
}

/**
 * Generate base directory name for batch
 * Format: {customer_prefix}_{date}_batch-{counter}
 * Example: "PL_DXB_2025-11-05_batch-1"
 */
function generateBaseDirName(customerPrefix, batchDate, batchCounter) {
  // Ensure customerPrefix is normalized
  const normalizedPrefix = customerPrefix.replace('-', '_').toUpperCase();
  
  // Format date as YYYY-MM-DD
  const formattedDate = batchDate instanceof Date 
    ? batchDate.toISOString().split('T')[0]
    : batchDate;

  return `${normalizedPrefix}_${formattedDate}_batch-${batchCounter}`;
}

/**
 * Calculate total size from files
 * Sum up all file sizes
 */
function calculateTotalSize(files) {
  if (!files || !Array.isArray(files)) return 0;
  
  return files.reduce((total, file) => {
    // file.size is in bytes (from browser File object)
    // or we can estimate from base64: (base64String.length * 3 / 4)
    if (file.size) return total + file.size;
    if (file.file_data) {
      // Estimate size from base64 (removes ~25% for encoding overhead)
      return total + Math.ceil(file.file_data.length * 0.75);
    }
    return total;
  }, 0);
}

/**
 * Infer render description from file count
 * Used as fallback if user doesn't provide one
 */
function inferRenderDescription(fileCount) {
  if (!fileCount || fileCount <= 0) return 'Render';
  return `${fileCount}-file_Render`;
}

/**
 * Create a new batch record
 * Handles all batch creation logic
 */
async function createBatch(db, {
  filenames,
  renderDescription,
  pipelineId,
  totalSize,
}) {
  try {
    // Extract customer prefix from filenames
    const customerPrefix = extractCustomerPrefix(filenames);
    if (!customerPrefix) {
      throw new Error('Could not extract customer prefix from filenames');
    }

    // Get today's date
    const batchDate = new Date().toISOString().split('T')[0];

    // Get next batch counter for this customer/date
    const batchCounter = await getNextBatchCounter(db, customerPrefix, batchDate);

    // Generate base directory name
    const baseDirName = generateBaseDirName(customerPrefix, batchDate, batchCounter);

    // Infer description if not provided
    const finalDescription = renderDescription 
      ? renderDescription.trim()
      : inferRenderDescription(filenames.length);

    // Create batch record
    const batchId = uuid();
    const result = await db.query(
      `INSERT INTO batches (
        id,
        customer_prefix,
        batch_date,
        batch_counter,
        base_directory_name,
        render_description,
        total_files,
        total_pipelines,
        total_size,
        pipeline_id,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *`,
      [
        batchId,
        customerPrefix,
        batchDate,
        batchCounter,
        baseDirName,
        finalDescription,
        filenames.length,
        1, // total_pipelines (always 1 for now)
        totalSize,
        pipelineId,
        'queued',
      ]
    );

    return result.rows[0];
  } catch (err) {
    console.error('Error creating batch:', err);
    throw err;
  }
}

/**
 * Get batch with all its jobs
 */
async function getBatchWithJobs(db, batchId) {
  try {
    const batchResult = await db.query(
      'SELECT * FROM batches WHERE id = $1',
      [batchId]
    );

    if (batchResult.rows.length === 0) {
      return null;
    }

    const batch = batchResult.rows[0];

    // Fetch all jobs in batch
    const jobsResult = await db.query(
      `SELECT id, pipeline_id, status, file_name, created_at, updated_at
       FROM jobs 
       WHERE batch_id = $1 
       ORDER BY created_at ASC`,
      [batchId]
    );

    batch.jobs = jobsResult.rows;
    return batch;
  } catch (err) {
    console.error('Error fetching batch with jobs:', err);
    throw err;
  }
}

/**
 * Get all batches with summary stats
 * Supports filtering and sorting
 */
async function getAllBatches(db, {
  status = null,
  customerPrefix = null,
  sortBy = 'created_at',
  sortOrder = 'DESC',
  limit = 50,
  offset = 0,
} = {}) {
  try {
    let query = 'SELECT * FROM batches WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    // Add filters
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (customerPrefix) {
      query += ` AND customer_prefix = $${paramIndex++}`;
      params.push(customerPrefix);
    }

    // Add sorting
    const allowedSortColumns = ['created_at', 'total_files', 'status', 'batch_date'];
    const sortColumn = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortDir}`;

    // Add pagination
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  } catch (err) {
    console.error('Error fetching batches:', err);
    throw err;
  }
}

/**
 * Get batch statistics
 * Used for dashboard/monitoring
 */
async function getBatchStats(db) {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_batches,
        COUNT(CASE WHEN status = 'queued' THEN 1 END) as queued,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        SUM(total_files) as total_files_all_time,
        SUM(total_size) as total_size_all_time,
        AVG(total_files) as avg_files_per_batch,
        MAX(total_files) as max_files_in_batch
      FROM batches
    `);

    return result.rows[0];
  } catch (err) {
    console.error('Error fetching batch stats:', err);
    throw err;
  }
}

/**
 * Update batch status
 * Called when batch is processing/completed/failed
 */
async function updateBatchStatus(db, batchId, newStatus) {
  try {
    const result = await db.query(
      `UPDATE batches 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, batchId]
    );

    return result.rows[0];
  } catch (err) {
    console.error('Error updating batch status:', err);
    throw err;
  }
}

module.exports = {
  extractCustomerPrefix,
  getNextBatchCounter,
  generateBaseDirName,
  calculateTotalSize,
  inferRenderDescription,
  createBatch,
  getBatchWithJobs,
  getAllBatches,
  getBatchStats,
  updateBatchStatus,
};
