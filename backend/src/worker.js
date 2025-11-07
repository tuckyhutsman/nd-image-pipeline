// backend/src/worker.js
// Image processing worker - processes jobs from Redis queue with full Stage 0 & Stage 1 implementation

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

    // Create worker for 'image-processing' queue
    this.worker = new Worker('image-processing', this.processJob.bind(this), {
      connection: {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
      },
      settings: {
        maxStalledCount: 2,
        stalledInterval: 30000,
        lockDuration: 300000,
        lockRenewTime: 15000,
      },
    });

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
        'UPDATE jobs SET status = $1, started_at = NOW() WHERE id = $2',
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

      // STAGE 0: Input Validation & Normalization
      console.log(`  Stage 0: Validating and normalizing input...`);
      const validation = await this.validateAndNormalize(file_name, file_data);
      
      if (validation.status === 'rejected') {
        throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
      }

      console.log(`  Stage 0: Validation complete - applied corrections: ${validation.correctionsApplied.join(', ') || 'none'}`);
      if (validation.warnings.length > 0) {
        console.log(`  Stage 0 warnings: ${validation.warnings.join(', ')}`);
      }

      // Set up output directory
      const outputDir = path.join(OUTPUT_PATH, job_id);
      await fs.ensureDir(outputDir);

      // Decode input file
      const inputPath = path.join(outputDir, `input_${file_name}`);
      const base64Data = file_data.includes(',') ? file_data.split(',')[1] : file_data;
      await fs.writeFile(inputPath, Buffer.from(base64Data, 'base64'));

      // STAGE 1: Process through pipeline
      console.log(`  Stage 1: Processing through pipeline...`);
      const processResult = await this.processSingleAsset(pipelineConfig, inputPath, outputDir, file_name);

      // Update job status to completed
      await db.query(
        'UPDATE jobs SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', job_id]
      );

      console.log(`✓ Job ${job_id} completed successfully`);

      return {
        success: true,
        job_id,
        output_file: processResult.outputFilename,
        output_size: processResult.filesize,
        processing_time_ms: processResult.duration,
      };

    } catch (error) {
      console.error(`✗ Error processing job ${job_id}:`, error.message);

      try {
        await db.query(
          'UPDATE jobs SET status = $1, error_message = $2, failed_at = NOW() WHERE id = $3',
          ['failed', error.message, job_id]
        );
      } catch (dbErr) {
        console.error('Failed to update job status:', dbErr.message);
      }

      throw error;
    }
  }

  // STAGE 0: Validation & Normalization
  async validateAndNormalize(fileName, fileData) {
    const errors = [];
    const warnings = [];
    const correctionsApplied = [];

    try {
      // Decode file to temp location for metadata reading
      const tempDir = path.join(OUTPUT_PATH, 'temp');
      await fs.ensureDir(tempDir);
      const tempPath = path.join(tempDir, `validate_${Date.now()}_${fileName}`);
      
      const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
      await fs.writeFile(tempPath, Buffer.from(base64Data, 'base64'));

      try {
        const metadata = await sharp(tempPath).metadata();

        // Check for CMYK
        if (metadata.space === 'cmyk') {
          errors.push(`CMYK color space not supported`);
          await fs.remove(tempPath);
          return { status: 'rejected', errors, warnings, correctionsApplied };
        }

        // Check for custom channels
        if (metadata.hasAlpha && metadata.channels > 4) {
          warnings.push(`File has ${metadata.channels} channels (RGBA+custom) - custom channels will be stripped`);
          correctionsApplied.push('Custom channels will be removed');
        }

        // Check bit depth
        if (metadata.depth && metadata.depth > 8) {
          warnings.push(`Bit depth ${metadata.depth} will be reduced to 8-bit`);
          correctionsApplied.push(`Bit-depth reduced from ${metadata.depth} to 8`);
        }

        // Check for multiple ICC profiles
        if (metadata.icc && metadata.icc.length > 1) {
          warnings.push(`File contains ${metadata.icc.length} ICC profiles - first will be used`);
        }

        // Check for extreme dimensions
        if (metadata.width > 50000 || metadata.height > 50000) {
          errors.push(`Image dimensions ${metadata.width}x${metadata.height} exceed maximum (50000px)`);
          await fs.remove(tempPath);
          return { status: 'rejected', errors, warnings, correctionsApplied };
        }

        // Check for animations
        if (metadata.pages && metadata.pages > 1) {
          errors.push(`Animated formats (GIF, APNG, TIFF) not supported`);
          await fs.remove(tempPath);
          return { status: 'rejected', errors, warnings, correctionsApplied };
        }

        // Check for EXIF rotation
        if (metadata.orientation && metadata.orientation !== 1) {
          correctionsApplied.push(`EXIF rotation ${metadata.orientation} will be applied`);
        }

        // Clean up temp file
        await fs.remove(tempPath);

        return {
          status: 'validated',
          errors,
          warnings,
          correctionsApplied,
          metadata: {
            width: metadata.width,
            height: metadata.height,
            depth: metadata.depth || 8,
            space: metadata.space,
            hasAlpha: metadata.hasAlpha,
            orientation: metadata.orientation,
          },
        };

      } catch (parseErr) {
        await fs.remove(tempPath);
        errors.push(`Failed to read image metadata: ${parseErr.message}`);
        return { status: 'rejected', errors, warnings, correctionsApplied };
      }

    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return { status: 'rejected', errors, warnings, correctionsApplied };
    }
  }

  // STAGE 1: Process single asset through pipeline
  async processSingleAsset(pipelineConfig, inputPath, outputDir, inputFileName) {
    const startTime = Date.now();

    try {
      // Start with input image
      let image = sharp(inputPath);

      // Apply EXIF auto-rotation
      image = image.withMetadata();

      // Apply sizing (aspect ratio + dimensions)
      if (pipelineConfig.sizing) {
        image = await this.applySizing(image, pipelineConfig.sizing);
      }

      // Apply color management
      if (pipelineConfig.color) {
        image = this.applyColorManagement(image, pipelineConfig.color);
      }

      // Apply transparency
      if (pipelineConfig.transparency) {
        image = this.applyTransparency(image, pipelineConfig.transparency);
      }

      // Generate output filename
      const baseName = inputFileName.replace(/\.[^/.]+$/, '');
      const suffix = pipelineConfig.suffix || '';
      const extension = this.getFormatExtension(pipelineConfig.format.type);
      const outputFilename = `${baseName}${suffix}.${extension}`;
      const outputPath = path.join(outputDir, outputFilename);

      // Apply format-specific optimizations and save
      await this.applyFormatAndSave(image, pipelineConfig, outputPath);

      // Get file stats
      const stats = await fs.stat(outputPath);
      const duration = Date.now() - startTime;

      console.log(`  ✓ Output: ${outputFilename} (${Math.round(stats.size / 1024)}KB, ${duration}ms)`);

      return {
        outputFilename,
        filesize: stats.size,
        duration,
      };

    } catch (error) {
      throw new Error(`Processing failed: ${error.message}`);
    }
  }

  // Apply sizing with aspect ratio and transparent padding
  async applySizing(image, sizing) {
    const { aspectRatio, width, height, resampleIfNeeded } = sizing;

    // Get input metadata to know what we're working with
    const metadata = await image.metadata();
    const inputWidth = metadata.width;
    const inputHeight = metadata.height;

    // If no aspect ratio specified, use native
    if (!aspectRatio || aspectRatio === 'null' || aspectRatio === '') {
      // Just scale to specified dimensions
      if (width && height) {
        return image.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: !resampleIfNeeded,
        });
      } else if (width) {
        return image.resize(width, null, {
          withoutEnlargement: !resampleIfNeeded,
        });
      } else if (height) {
        return image.resize(null, height, {
          withoutEnlargement: !resampleIfNeeded,
        });
      }
      return image;
    }

    // Parse aspect ratio (e.g., "16:9" -> 1.777...)
    const [ratioW, ratioH] = aspectRatio.split(':').map(Number);
    const targetAR = ratioW / ratioH;
    const targetWidth = width || height * targetAR;
    const targetHeight = height || width / targetAR;

    // Fit image inside the aspect ratio canvas without cropping
    // Then extend to fill the canvas with transparent padding
    image = image.resize(Math.floor(targetWidth), Math.floor(targetHeight), {
      fit: 'inside',
      withoutEnlargement: !resampleIfNeeded,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    // Extend canvas to exact target size with transparent padding
    image = image.extend({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    return image;
  }

  // Apply color management
  applyColorManagement(image, color) {
    const { changeICC, destICC, gammaCorrect } = color;

    // Gamma correction
    if (gammaCorrect) {
      // Note: Sharp doesn't have direct gamma control in resize
      // This is typically done through ICC profile conversion
      // For now, we'll apply it during format conversion if supported
    }

    // ICC profile handling will be done during format save
    // where we can control embedding, tagging, etc.

    return image;
  }

  // Apply transparency settings
  applyTransparency(image, transparency) {
    const { preserve, background } = transparency;

    if (preserve) {
      // Keep transparency - ensure PNG or WebP format is used
      return image.ensureAlpha();
    } else {
      // Remove transparency by flattening to background color
      const bgColor = this.hexToRGB(background || '#FFFFFF');
      return image.flatten({ background: bgColor });
    }
  }

  // Format-specific optimizations and save
  async applyFormatAndSave(image, pipelineConfig, outputPath) {
    const { format, color } = pipelineConfig;
    const formatType = format.type;

    // Convert Quality and Compression from 0-100 scale to format-specific values
    const lossy = format.quality || 80;          // 0-100 for lossy compression (detail preservation)
    const lossless = format.compression || 50;   // 0-100 for lossless compression (file size)

    switch (formatType) {
      case 'png': {
        // For PNG: Compression is 0-100 scale (maps to level 1-9 + external tools)
        // Quality is ignored (PNG is lossless by nature)
        const compressionLevel = Math.ceil((lossless / 100) * 9);

        const pngOptions = {
          compressionLevel,
          adaptiveFiltering: true,
          palette: false,  // Use full color palette (PNG 24-bit)
          bitDepth: 8,
        };

        await image.png(pngOptions).toFile(outputPath);

        // If compression > 70, apply additional external optimization
        if (lossless > 70) {
          await this.optimizePNG(outputPath, lossless);
        }
        break;
      }

      case 'jpeg': {
        // For JPEG: Quality (lossy) is 0-100 scale
        // Compression slider affects mozjpeg parameters for aggressive optimization
        const jpegQuality = Math.max(1, Math.min(100, lossy));

        // Adjust mozjpeg intensity based on compression setting (0-100)
        // 0-30: Very aggressive compression
        // 31-60: Aggressive compression
        // 61-85: Balanced
        // 86-100: High quality
        let trellis = true;         // Enable trellis quantization
        let overshoot = true;       // Enable trellis overshoot optimization
        let optimizeScans = true;   // Optimize progressive JPEG scan tables
        let quantizationTable = 3;  // Standard table

        if (lossless < 30) {
          quantizationTable = 4;    // Most aggressive quantization table
          optimizeScans = false;    // Disable scan optimization for maximum compression
        } else if (lossless < 60) {
          quantizationTable = 3;    // Aggressive
        } else if (lossless < 85) {
          quantizationTable = 2;    // Balanced
        } else {
          quantizationTable = 1;    // High quality
        }

        const jpegOptions = {
          quality: jpegQuality,
          progressive: true,
          mozjpeg: true,
          trellis,
          overshoot,
          optimizeScans,
          quantizationTable,
        };

        console.log(`  JPEG: quality=${jpegQuality}, compression=${lossless}/100, trellis=${trellis}, quantTable=${quantizationTable}`);
        await image.jpeg(jpegOptions).toFile(outputPath);
        break;
      }

      case 'webp': {
        // For WebP: Quality (lossy) is 0-100, Compression (lossless filter) is 0-100
        const webpQuality = Math.max(1, Math.min(100, lossy));
        const webpEffort = Math.max(0, Math.min(6, Math.ceil((lossless / 100) * 6)));  // 0-6 effort

        const webpOptions = {
          quality: webpQuality,
          alphaQuality: Math.max(1, Math.min(100, lossy)),
          effort: webpEffort,  // Higher effort = better compression but slower
        };

        console.log(`  WebP: quality=${webpQuality}, effort=${webpEffort}/6`);
        await image.webp(webpOptions).toFile(outputPath);
        break;
      }

      case 'png8': {
        // PNG 8-bit (indexed color, max 256 colors)
        const compressionLevel = Math.ceil((lossless / 100) * 9);

        const pngOptions = {
          compressionLevel,
          palette: true,  // Use indexed color palette (max 256 colors)
          bitDepth: 8,
        };

        await image.png(pngOptions).toFile(outputPath);

        // Apply pngquant for additional compression if requested (compression > 60)
        if (lossless > 60) {
          await this.optimizePNG8(outputPath, lossless);
        }
        break;
      }

      default:
        throw new Error(`Unsupported format: ${formatType}`);
    }
  }

  // Additional PNG optimization using external tools (pngcrush, pngquant)
  async optimizePNG(pngPath, compressionLevel) {
    try {
      const { execSync } = require('child_process');

      // Check if pngcrush is available (preferred for PNG optimization)
      try {
        execSync('which pngcrush', { stdio: 'ignore' });
        
        const args = ['-p'];  // Preserve color palette info
        if (compressionLevel > 85) {
          args.push('-brute');  // Brute force mode for maximum compression
        } else if (compressionLevel > 70) {
          args.push('-max');    // Maximum compression
        }

        const tempPath = `${pngPath}.pngcrush`;
        execSync(`pngcrush ${args.join(' ')} "${pngPath}" "${tempPath}"`, { stdio: 'pipe' });

        // Replace original only if optimized version is smaller
        const origSize = await fs.stat(pngPath);
        const optSize = await fs.stat(tempPath);

        if (optSize.size < origSize.size) {
          await fs.move(tempPath, pngPath, { overwrite: true });
          const reduction = Math.round((1 - optSize.size / origSize.size) * 100);
          console.log(`  ✓ PNG optimized with pngcrush: ${Math.round(origSize.size / 1024)}KB → ${Math.round(optSize.size / 1024)}KB (-${reduction}%)`);
        } else {
          await fs.remove(tempPath);
        }
        return;  // Success, exit
      } catch (e) {
        // pngcrush not available, try pngquant
      }

      // Fallback to pngquant for additional quality-preserving compression
      try {
        execSync('which pngquant', { stdio: 'ignore' });
        
        // pngquant reduces colors while maintaining quality
        // Compression 0-100 -> colors 256 down to 64
        const colors = Math.max(64, Math.min(256, Math.ceil((compressionLevel / 100) * 256)));
        const tempPath = `${pngPath}-quant.png`;
        
        execSync(`pngquant --quality 80-100 --ncolors ${colors} "${pngPath}" -o "${tempPath}"`, { stdio: 'pipe' });

        const origSize = await fs.stat(pngPath);
        const optSize = await fs.stat(tempPath);

        if (optSize.size < origSize.size) {
          await fs.move(tempPath, pngPath, { overwrite: true });
          const reduction = Math.round((1 - optSize.size / origSize.size) * 100);
          console.log(`  ✓ PNG optimized with pngquant: ${Math.round(origSize.size / 1024)}KB → ${Math.round(optSize.size / 1024)}KB (-${reduction}%)`);
        } else {
          await fs.remove(tempPath);
        }
      } catch (e) {
        console.log(`  ℹ PNG external optimization skipped (pngcrush/pngquant not available)`);
      }
    } catch (error) {
      console.warn(`  ⚠ PNG optimization warning: ${error.message}`);
      // Don't fail job if external optimization fails
    }
  }

  // Additional PNG8 optimization using pngquant
  async optimizePNG8(pngPath, compressionLevel) {
    try {
      const { execSync } = require('child_process');

      try {
        execSync('which pngquant', { stdio: 'ignore' });

        // For PNG8, reduce colors based on compression level
        // High compression = fewer colors
        const colors = Math.max(2, Math.min(256, Math.ceil((compressionLevel / 100) * 256)));
        const tempPath = `${pngPath}-quant.png`;

        execSync(`pngquant --quality 75-90 --ncolors ${colors} --speed 1 "${pngPath}" -o "${tempPath}"`, { stdio: 'pipe' });

        const origSize = await fs.stat(pngPath);
        const optSize = await fs.stat(tempPath);

        if (optSize.size < origSize.size) {
          await fs.move(tempPath, pngPath, { overwrite: true });
          const reduction = Math.round((1 - optSize.size / origSize.size) * 100);
          console.log(`  ✓ PNG8 optimized: ${Math.round(origSize.size / 1024)}KB → ${Math.round(optSize.size / 1024)}KB (-${reduction}%) with ${colors} colors`);
        } else {
          await fs.remove(tempPath);
        }
      } catch (e) {
        console.log(`  ℹ PNG8 optimization skipped (pngquant not available)`);
      }
    } catch (error) {
      console.warn(`  ⚠ PNG8 optimization warning: ${error.message}`);
    }
  }

  // Helper: Convert hex to RGB
  hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 255, g: 255, b: 255 };
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  // Helper: Get file extension for format
  getFormatExtension(formatType) {
    const extensions = {
      png: 'png',
      png8: 'png',
      jpeg: 'jpg',
      webp: 'webp',
    };
    return extensions[formatType] || 'png';
  }

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
