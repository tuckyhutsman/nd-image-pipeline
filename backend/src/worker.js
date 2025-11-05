// backend/src/worker.js
// Image processing worker - processes jobs from Redis queue

const { Worker } = require('bullmq');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const { Pool } = require('pg');

// Database connection
const db = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});

const OUTPUT_PATH = process.env.OUTPUT_PATH || '/tmp/pipeline-output';

class ImagePipelineWorker {
  constructor() {
    console.log('Initializing Image Pipeline Worker...');
    console.log(`Output path: ${OUTPUT_PATH}`);
    console.log(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

    // Create worker for 'image-processing' queue (matches API queue name)
    this.worker = new Worker('image-processing', this.processJob.bind(this), {
      connection: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
      },
      settings: {
        maxStalledCount: 2,
        stalledInterval: 30000,
        lockDuration: 300000, // 5 minutes
        lockRenewTime: 15000, // Renew every 15 seconds
      },
    });

    // Event handlers
    this.worker.on('completed', (job) => {
      console.log(`✓ Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.log(`✗ Job ${job.id} failed: ${err.message}`);
    });

    this.worker.on('active', (job) => {
      console.log(`→ Job ${job.id} started processing`);
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });
  }

  // Main job processing function
  async processJob(job) {
    const { job_id, pipeline_id, file_name, file_data } = job.data;
    
    console.log(`Processing job ${job_id}...`);
    console.log(`  Pipeline: ${pipeline_id}`);
    console.log(`  File: ${file_name}`);

    try {
      // Update job status to processing
      await db.query(
        'UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2',
        ['processing', job_id]
      );

      // Fetch pipeline configuration
      const pipelineResult = await db.query(
        'SELECT config FROM pipelines WHERE id = $1',
        [pipeline_id]
      );

      if (pipelineResult.rows.length === 0) {
        throw new Error(`Pipeline ${pipeline_id} not found`);
      }

      let pipelineConfig = pipelineResult.rows[0].config;
      if (typeof pipelineConfig === 'string') {
        pipelineConfig = JSON.parse(pipelineConfig);
      }

      // Validate pipeline config structure
      if (!pipelineConfig || !pipelineConfig.operations) {
        console.error('Invalid pipeline config:', pipelineConfig);
        throw new Error(`Pipeline configuration invalid. Got: ${JSON.stringify(pipelineConfig)}`);
      }

      // Decode base64 file data
      const outputDir = path.join(OUTPUT_PATH, job_id);
      await fs.ensureDir(outputDir);

      // Decode and write input file
      const inputPath = path.join(outputDir, `input_${file_name}`);
      const base64Data = file_data.includes(',') 
        ? file_data.split(',')[1] 
        : file_data;
      
      await fs.writeFile(inputPath, Buffer.from(base64Data, 'base64'));
      console.log(`  Input file written to: ${inputPath}`);

      // Process through pipeline operations
      let currentImage = sharp(inputPath);
      let currentPath = inputPath;
      const results = [];

      for (let i = 0; i < pipelineConfig.operations.length; i++) {
        const operation = pipelineConfig.operations[i];
        
        if (!operation.enabled) {
          console.log(`  Skipping disabled operation: ${operation.type}`);
          continue;
        }

        console.log(`  Applying operation ${i + 1}/${pipelineConfig.operations.length}: ${operation.type}`);

        try {
          currentImage = await this.applyOperation(currentImage, operation);
          results.push({
            step: i + 1,
            operation: operation.type,
            status: 'success',
            params: operation.params,
          });
        } catch (err) {
          console.error(`    Operation failed: ${err.message}`);
          results.push({
            step: i + 1,
            operation: operation.type,
            status: 'failed',
            error: err.message,
          });
          throw err;
        }
      }

      // Determine output format from last operation or default to original
      const outputFormat = this.getOutputFormat(pipelineConfig);
      const outputFilename = this.getOutputFilename(file_name, outputFormat);
      const outputPath = path.join(outputDir, outputFilename);

      // Save final output
      console.log(`  Saving output: ${outputFilename}`);
      await currentImage
        .toFormat(outputFormat.type, {
          quality: outputFormat.quality || 80,
        })
        .toFile(outputPath);

      // Get file stats
      const stats = await fs.stat(outputPath);
      console.log(`  Output file size: ${Math.round(stats.size / 1024)}KB`);

      // Update job status to completed
      await db.query(
        'UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2',
        ['completed', job_id]
      );

      console.log(`✓ Job ${job_id} processing complete`);

      return {
        success: true,
        job_id,
        output_file: outputFilename,
        output_size: stats.size,
        operations_applied: results.length,
        processing_results: results,
      };

    } catch (error) {
      console.error(`✗ Error processing job ${job_id}:`, error.message);

      try {
        await db.query(
          'UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2',
          ['failed', job_id]
        );
      } catch (dbErr) {
        console.error('Failed to update job status in database:', dbErr.message);
      }

      throw error;
    }
  }

  // Apply individual operation to image
  async applyOperation(image, operation) {
    const { type, params } = operation;

    switch (type) {
      case 'resize': {
        const width = parseInt(params.width, 10);
        const height = parseInt(params.height, 10);
        const fit = params.fit || 'cover';

        if (!width || !height) {
          throw new Error('Resize requires width and height');
        }

        return image.resize(width, height, { fit });
      }

      case 'crop': {
        const x = parseInt(params.x, 10) || 0;
        const y = parseInt(params.y, 10) || 0;
        const width = parseInt(params.width, 10);
        const height = parseInt(params.height, 10);

        if (!width || !height) {
          throw new Error('Crop requires width and height');
        }

        return image.extract({ left: x, top: y, width, height });
      }

      case 'format_convert': {
        // Format conversion is handled at save time, but we can validate
        const format = params.format || 'jpeg';
        const validFormats = ['jpeg', 'png', 'webp', 'avif', 'tiff'];

        if (!validFormats.includes(format)) {
          throw new Error(`Unsupported format: ${format}`);
        }

        return image; // Actual conversion happens during save
      }

      case 'color_adjust': {
        // Placeholder for color adjustments
        return image;
      }

      case 'watermark': {
        // Placeholder for watermarking
        return image;
      }

      case 'thumbnail': {
        const size = parseInt(params.size, 10) || 150;
        return image.resize(size, size, { fit: 'cover' });
      }

      case 'optimize': {
        const level = params.level || 'balanced';

        switch (level) {
          case 'high':
            return image.withMetadata(false);
          case 'balanced':
            return image;
          case 'low':
            return image;
          default:
            return image;
        }
      }

      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
  }

  // Determine output format from pipeline config
  getOutputFormat(pipelineConfig) {
    // Look for format_convert operation
    const formatOp = pipelineConfig.operations.find(
      (op) => op.type === 'format_convert' && op.enabled
    );

    if (formatOp) {
      return {
        type: formatOp.params.format || 'jpeg',
        quality: parseInt(formatOp.params.quality, 10) || 80,
      };
    }

    // Default to JPEG
    return { type: 'jpeg', quality: 80 };
  }

  // Generate output filename
  getOutputFilename(inputFilename, format) {
    const name = inputFilename.replace(/\.[^/.]+$/, '');
    return `${name}_processed.${format.type}`;
  }

  // Start the worker
  start() {
    console.log('✓ Worker started, listening for jobs on "image-processing" queue...');
  }
}

// Initialize and start worker
const worker = new ImagePipelineWorker();
worker.start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await worker.worker.close();
  process.exit(0);
});

module.exports = worker;
