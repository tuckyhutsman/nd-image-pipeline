// Automatic Batch Cleanup Service
// Deletes old batches based on retention policy
// Preserves batches with custom names (user wants to keep them)

const fs = require('fs').promises;
const path = require('path');

// Configuration from environment
const BATCH_RETENTION_DAYS = parseInt(process.env.BATCH_RETENTION_DAYS || '30', 10);
const FAILED_BATCH_RETENTION_DAYS = parseInt(process.env.FAILED_BATCH_RETENTION_DAYS || '7', 10);
const AUTO_CLEANUP_ENABLED = process.env.AUTO_CLEANUP_ENABLED !== 'false'; // Default: true
const CLEANUP_INTERVAL_HOURS = parseInt(process.env.CLEANUP_INTERVAL_HOURS || '24', 10);

class CleanupService {
  constructor(pool) {
    this.pool = pool;
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Start the automatic cleanup service
   */
  start() {
    if (!AUTO_CLEANUP_ENABLED) {
      console.log('[Cleanup] Automatic cleanup is disabled (AUTO_CLEANUP_ENABLED=false)');
      return;
    }

    console.log(`[Cleanup] Starting automatic cleanup service`);
    console.log(`[Cleanup] Configuration:`);
    console.log(`  - Completed batch retention: ${BATCH_RETENTION_DAYS} days`);
    console.log(`  - Failed batch retention: ${FAILED_BATCH_RETENTION_DAYS} days`);
    console.log(`  - Cleanup interval: ${CLEANUP_INTERVAL_HOURS} hours`);
    console.log(`  - Custom-named batches: NEVER deleted`);

    // Run immediately on startup
    this.runCleanup();

    // Schedule periodic cleanup
    const intervalMs = CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
    this.intervalId = setInterval(() => {
      this.runCleanup();
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop the automatic cleanup service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Cleanup] Cleanup service stopped');
  }

  /**
   * Run the cleanup process
   */
  async runCleanup() {
    const startTime = Date.now();
    console.log('[Cleanup] Starting cleanup run...');

    try {
      const results = {
        completedBatchesDeleted: 0,
        failedBatchesDeleted: 0,
        filesDeleted: 0,
        errors: []
      };

      // Clean up completed batches
      const completedResult = await this.cleanupOldBatches('completed', BATCH_RETENTION_DAYS);
      results.completedBatchesDeleted = completedResult.batchesDeleted;
      results.filesDeleted += completedResult.filesDeleted;
      results.errors.push(...completedResult.errors);

      // Clean up failed batches (shorter retention)
      const failedResult = await this.cleanupOldBatches('failed', FAILED_BATCH_RETENTION_DAYS);
      results.failedBatchesDeleted = failedResult.batchesDeleted;
      results.filesDeleted += failedResult.filesDeleted;
      results.errors.push(...failedResult.errors);

      const duration = Date.now() - startTime;
      
      console.log('[Cleanup] Cleanup completed:');
      console.log(`  - Completed batches deleted: ${results.completedBatchesDeleted}`);
      console.log(`  - Failed batches deleted: ${results.failedBatchesDeleted}`);
      console.log(`  - Files deleted: ${results.filesDeleted}`);
      console.log(`  - Duration: ${duration}ms`);
      
      if (results.errors.length > 0) {
        console.log(`  - Errors encountered: ${results.errors.length}`);
        results.errors.forEach((err, idx) => {
          console.error(`    Error ${idx + 1}:`, err);
        });
      }

      return results;
    } catch (error) {
      console.error('[Cleanup] Cleanup run failed:', error);
      throw error;
    }
  }

  /**
   * Clean up old batches of a specific status
   * @param {string} status - Batch status to clean up ('completed' or 'failed')
   * @param {number} retentionDays - Number of days to retain batches
   */
  async cleanupOldBatches(status, retentionDays) {
    const results = {
      batchesDeleted: 0,
      filesDeleted: 0,
      errors: []
    };

    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Find eligible batches for deletion
      // Criteria:
      // 1. Status matches (completed or failed)
      // 2. Older than retention period
      // 3. NOT custom-named (name_customized = false OR NULL)
      const query = `
        SELECT 
          id, 
          base_directory_name,
          custom_name,
          name_customized,
          status,
          created_at,
          completed_at,
          (SELECT COUNT(*) FROM jobs WHERE batch_id = batches.id) as job_count
        FROM batches
        WHERE status = $1
          AND created_at < $2
          AND (name_customized = false OR name_customized IS NULL)
        ORDER BY created_at ASC
      `;

      const result = await this.pool.query(query, [status, cutoffDate]);
      const batches = result.rows;

      console.log(`[Cleanup] Found ${batches.length} ${status} batches older than ${retentionDays} days`);

      // Delete each batch
      for (const batch of batches) {
        try {
          await this.deleteBatch(batch);
          results.batchesDeleted++;
          results.filesDeleted += batch.job_count || 0;
        } catch (error) {
          console.error(`[Cleanup] Error deleting batch ${batch.id}:`, error);
          results.errors.push({
            batchId: batch.id,
            directoryName: batch.base_directory_name,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error(`[Cleanup] Error cleaning up ${status} batches:`, error);
      results.errors.push({
        status,
        error: error.message
      });
      return results;
    }
  }

  /**
   * Delete a single batch and its files
   * @param {object} batch - Batch record from database
   */
  async deleteBatch(batch) {
    const batchId = batch.id;
    const directoryName = batch.base_directory_name;

    console.log(`[Cleanup] Deleting batch: ${directoryName} (${batchId})`);

    // Delete database record (CASCADE will delete jobs)
    await this.pool.query('DELETE FROM batches WHERE id = $1', [batchId]);

    // Delete files from disk
    const outputPath = path.join('/app/output', directoryName);
    
    try {
      await fs.access(outputPath);
      await fs.rm(outputPath, { recursive: true, force: true });
      console.log(`[Cleanup] Deleted directory: ${outputPath}`);
    } catch (error) {
      // Directory might not exist - that's okay
      if (error.code !== 'ENOENT') {
        console.warn(`[Cleanup] Could not delete directory ${outputPath}:`, error.message);
      }
    }
  }

  /**
   * Get cleanup statistics without performing deletion
   * Useful for reporting/monitoring
   */
  async getCleanupStats() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - BATCH_RETENTION_DAYS);

    const failedCutoffDate = new Date();
    failedCutoffDate.setDate(failedCutoffDate.getDate() - FAILED_BATCH_RETENTION_DAYS);

    const query = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(total_files) as total_files,
        SUM(total_output_size) as total_size
      FROM batches
      WHERE 
        (
          (status = 'completed' AND created_at < $1)
          OR
          (status = 'failed' AND created_at < $2)
        )
        AND (name_customized = false OR name_customized IS NULL)
      GROUP BY status
    `;

    const result = await this.pool.query(query, [cutoffDate, failedCutoffDate]);

    return {
      enabled: AUTO_CLEANUP_ENABLED,
      retentionDays: BATCH_RETENTION_DAYS,
      failedRetentionDays: FAILED_BATCH_RETENTION_DAYS,
      intervalHours: CLEANUP_INTERVAL_HOURS,
      eligibleForCleanup: result.rows
    };
  }
}

module.exports = CleanupService;
