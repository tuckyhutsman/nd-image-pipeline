// backend/src/worker.js

const { Worker } = require('bullmq');
const sharp = require('sharp');
const fs = require('fs-extra');
const path = require('path');
const db = require('./db');

const OUTPUT_PATH = '/tmp/pipeline-output';

class ImagePipelineWorker {
  constructor() {
    this.worker = new Worker('image-jobs', this.processJob.bind(this), {
      connection: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379
      },
      settings: {
        maxStalledCount: 2,
        stalledInterval: 30000
      }
    });

    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.log(`Job ${job.id} failed: ${err.message}`);
    });
  }

  async processJob(job) {
    console.log(`Processing job ${job.id}...`);
    
    const jobData = job.data;
    const jobId = job.id;

    try {
      // STAGE 0: Validate & Normalize Input
      console.log('Stage 0: Validating input...');
      const validation = await this.validateAndNormalize(jobData);
      
      if (validation.status === 'rejected') {
        await this.updateJobStatus(jobId, 'failed', {
          stage: 'validation',
          errors: validation.errors
        });
        return;
      }

      // Update job with validation results
      await db.query(
        'UPDATE jobs SET stage_0_validation = $1 WHERE id = $2',
        [JSON.stringify(validation), jobId]
      );

      // Parse filename for Dropbox routing (future)
      const parsedFilename = this.parseFilename(jobData.file_name);

      // Fetch Multi-Asset Pipeline
      const pipelineResult = await db.query(
        'SELECT components FROM multi_asset_pipelines WHERE id = $1',
        [jobData.pipeline_id]
      );

      if (pipelineResult.rows.length === 0) {
        throw new Error('Pipeline not found');
      }

      const pipelineComponents = pipelineResult.rows[0].components;

      // STAGE 1: Process each component in parallel
      console.log('Stage 1: Processing through pipeline components...');
      const outputDir = path.join(OUTPUT_PATH, jobId);
      await fs.ensureDir(outputDir);

      const assetPromises = pipelineComponents.map((component, index) =>
        this.processSingleAsset(
          jobData,
          component,
          validation.normalized_file_path,
          outputDir,
          index
        )
      );

      const outputs = await Promise.allSettled(assetPromises);

      // Handle results - warn & continue on failure
      const successfulOutputs = [];
      const failedOutputs = [];

      outputs.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulOutputs.push(result.value);
        } else {
          failedOutputs.push({
            component: pipelineComponents[index],
            error: result.reason.message
          });
        }
      });

      // Warn user if any failed
      if (failedOutputs.length > 0) {
        console.warn(`⚠️  ${failedOutputs.length} components failed, continuing...`);
      }

      // Update job with outputs
      await db.query(
        'UPDATE jobs SET outputs = $1, parsed_filename = $2 WHERE id = $3',
        [
          JSON.stringify(successfulOutputs),
          JSON.stringify(parsedFilename),
          jobId
        ]
      );

      // Update status to completed
      await db.query(
        'UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2',
        ['completed', jobId]
      );

      return {
        success: true,
        outputs: successfulOutputs,
        warnings: failedOutputs
      };

    } catch (error) {
      console.error(`Job ${jobId} error:`, error);
      
      await db.query(
        'UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2',
        ['failed', jobId]
      );

      throw error;
    }
  }

  // STAGE 0: Validation & Normalization
  async validateAndNormalize(jobData) {
    const filePath = jobData.input_file_path;
    const corrections = [];
    const errors = [];
    const warnings = [];

    try {
      // Read file metadata
      const metadata = await sharp(filePath).metadata();

      // Check for CMYK
      if (metadata.space === 'cmyk') {
        errors.push(`File uses CMYK color space - not supported`);
        return { status: 'rejected', errors };
      }

      // Check for custom channels (non-standard)
      if (metadata.hasAlpha === true && metadata.channels > 4) {
        warnings.push('File has custom channels beyond RGBA - they will be stripped');
        corrections.push('Custom channels removed');
      }

      // Check bit depth
      if (metadata.depth && metadata.depth > 8) {
        corrections.push(`Reduced bit-depth from ${metadata.depth} to 8`);
      }

      // Check for multiple ICC profiles
      if (metadata.icc && metadata.icc.length > 1) {
        warnings.push(`Multiple ICC profiles detected (${metadata.icc.length}). Using first.`);
      }

      // Check for extreme dimensions
      if (metadata.width > 50000 || metadata.height > 50000) {
        errors.push('Image dimensions exceed maximum (50000px)');
        return { status: 'rejected', errors };
      }

      // Check for animations
      if (metadata.pages && metadata.pages > 1) {
        errors.push('Animated formats (GIF, APNG, TIFF) not supported');
        return { status: 'rejected', errors };
      }

      // Normalize file if needed
      let normalizedPath = filePath;
      let applied = [];

      let pipeline = sharp(filePath);

      // Reduce bit depth to 8
      if (metadata.depth && metadata.depth > 8) {
        pipeline = pipeline.toFormat('png', { bitDepth: 8 });
        applied.push('bit_depth_reduced');
      }

      // Apply EXIF rotation
      if (metadata.orientation) {
        pipeline = pipeline.withMetadata();
        applied.push('exif_rotation_applied');
      }

      // If any transformations needed, save normalized version
      if (applied.length > 0) {
        normalizedPath = filePath.replace(/\.(\w+)$/, '_normalized.$1');
        await pipeline.toFile(normalizedPath);
      }

      return {
        status: 'validated',
        normalized_file_path: normalizedPath,
        corrections_applied: corrections,
        warnings,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          depth: metadata.depth || 8,
          space: metadata.space,
          hasAlpha: metadata.hasAlpha
        }
      };

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return { status: 'rejected', errors };
    }
  }

  // Process single asset through a component pipeline
  async processSingleAsset(jobData, component, inputPath, outputDir, index) {
    // Fetch the single asset pipeline config
    const pipelineResult = await db.query(
      'SELECT config FROM single_asset_pipelines WHERE id = $1',
      [component.ref]
    );

    if (pipelineResult.rows.length === 0) {
      throw new Error(`Pipeline component ${component.ref} not found`);
    }

    const config = pipelineResult.rows[0].config;
    const startTime = Date.now();

    try {
      let image = sharp(inputPath);

      // Apply sizing
      if (config.sizing) {
        image = this.applySizing(image, config.sizing);
      }

      // Apply color management
      if (config.color) {
        image = this.applyColorManagement(image, config.color);
      }

      // Apply transparency
      if (config.transparency) {
        image = this.applyTransparency(image, config.transparency);
      }

      // Apply format & encoding
      const outputFilename = `${jobData.file_name.replace(/\.[^/.]+$/, '')}${config.suffix}.${config.format.type}`;
      const outputPath = path.join(outputDir, outputFilename);

      image = this.applyFormat(image, config);

      // Save with format-specific optimizations
      await image.toFile(outputPath);

      const duration = Date.now() - startTime;
      const stats = fs.statSync(outputPath);

      return {
        filename: outputFilename,
        pipeline_component: config.name,
        suffix: config.suffix,
        format: config.format.type,
        dimensions: config.sizing,
        filesize_bytes: stats.size,
        processing_time_ms: duration,
        settings: config
      };

    } catch (error) {
      throw new Error(`Component ${config.name} failed: ${error.message}`);
    }
  }

  // Sizing logic
  applySizing(image, sizing) {
    const { aspectRatio, width, height, fit, dpi } = sizing;

    if (!aspectRatio || aspectRatio === 'null') {
      // Native aspect ratio - just apply width/height
      return image.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Parse aspect ratio
    const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
    const targetAR = ratioW / ratioH;

    // Create canvas and fit image
    return image
      .resize(width, height, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }, // Transparent
        withoutEnlargement: false
      })
      .extend({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent padding
      });
  }

  // Color management
  applyColorManagement(image, color) {
    const { gammaCorrect } = color;
    
    if (gammaCorrect) {
      image = image.gamma(2.2);
    }

    // ICC profile handling done during format export
    return image;
  }

  // Transparency
  applyTransparency(image, transparency) {
    if (!transparency.preserve) {
      const bgColor = transparency.background;
      return image.flatten({ background: bgColor });
    }
    return image;
  }

  // Format & encoding with optimization
  applyFormat(image, config) {
    const { format } = config;

    if (format.type === 'png') {
      return image.png({
        compressionLevel: config.formatSpecific.png ? 
          Math.ceil(config.formatSpecific.png.compressionLevel / 11) : 9,
        adaptiveFiltering: true
      });
    }

    if (format.type === 'jpg') {
      return image.jpeg({
        quality: config.format.lossyQuality,
        progressive: config.formatSpecific.jpg?.progressive || false,
        mozjpeg: config.formatSpecific.jpg?.mozjpeg || false
      });
    }

    if (format.type === 'webp') {
      return image.webp({
        quality: config.format.lossyQuality,
        alphaQuality: config.formatSpecific.webp?.alphaQuality || 100
      });
    }

    throw new Error(`Unsupported format: ${format.type}`);
  }

  // Filename parsing for Dropbox routing
  parseFilename(filename) {
    // This will be populated from pattern in database
    // For now, just return basic parse
    return {
      original: filename,
      name: filename.replace(/\.[^/.]+$/, ''),
      ext: filename.split('.').pop()
    };
  }

  // Helper: Update job status
  async updateJobStatus(jobId, status, data = {}) {
    await db.query(
      'UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, jobId]
    );
  }

  start() {
    console.log('Worker started, listening for jobs...');
  }
}

// Start worker
const worker = new ImagePipelineWorker();
worker.start();

module.exports = worker;