const { Worker } = require('bullmq');
const redis = require('redis');
const { Pool } = require('pg');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Fix: Use correct host from environment
const db = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});

const OUTPUT_PATH = process.env.OUTPUT_PATH || '/tmp/pipeline-output';

// Fix: Redis URL should use service name 'redis', not localhost
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

async function resizeImage(inputBuffer, outputSpec) {
  try {
    let image = sharp(inputBuffer);
    const metadata = await image.metadata();

    let width = outputSpec.width;
    let height = outputSpec.height;
    let resizeOptions = { fit: 'cover' };

    if (outputSpec.fit === 'contain') {
      resizeOptions = { fit: 'contain', background: { r: 255, g: 255, b: 255 } };
    }

    if (outputSpec.quality === 'professional') {
      image = image.resize(width, height, {
        ...resizeOptions,
        kernel: 'lanczos3',
        withoutEnlargement: false,
      });
    } else {
      image = image.resize(width, height, resizeOptions);
    }

    const format = outputSpec.format || 'jpeg';
    if (format === 'jpeg' || format === 'jpg') {
      image = image.jpeg({ quality: outputSpec.quality || 85, progressive: true });
    } else if (format === 'png') {
      image = image.png({ quality: outputSpec.quality || 90 });
    } else if (format === 'webp') {
      image = image.webp({ quality: outputSpec.quality || 85 });
    }

    return await image.toBuffer();
  } catch (err) {
    console.error('Image resize error:', err);
    throw err;
  }
}

const worker = new Worker('image-processing', async (job) => {
  console.log(`Processing job ${job.id}...`);

  try {
    const { job_id, pipeline_id, file_name, file_data } = job.data;

const pipelineResult = await db.query(
  'SELECT config FROM pipelines WHERE id = $1',
  [pipeline_id]
);

if (pipelineResult.rows.length === 0) {
  throw new Error('Pipeline not found');
}

console.log('Pipeline result:', JSON.stringify(pipelineResult.rows[0]));
console.log('Config type:', typeof pipelineResult.rows[0].config);
console.log('Config value:', pipelineResult.rows[0].config);

let config = pipelineResult.rows[0].config;
if (typeof config === 'string') {
  config = JSON.parse(config);
}    const inputBuffer = Buffer.from(file_data, 'base64');
    const jobOutputDir = path.join(OUTPUT_PATH, job_id);
    fs.mkdirSync(jobOutputDir, { recursive: true });

    const outputs = [];
    for (const outputSpec of config.outputs) {
      const outputBuffer = await resizeImage(inputBuffer, outputSpec);
      const filename = `${outputSpec.name}.${outputSpec.format || 'jpg'}`;
      const filepath = path.join(jobOutputDir, filename);

      fs.writeFileSync(filepath, outputBuffer);
      outputs.push({ name: outputSpec.name, filename, path: filepath });
   }

    await db.query(
      `UPDATE jobs SET status = $1, output_data = $2, updated_at = NOW() WHERE id = $3`,
      ['completed', JSON.stringify(outputs), job_id]
    );

    console.log(`Job ${job_id} completed`);
    return { job_id, status: 'completed', outputs };

  } catch (err) {
    console.error('Job error:', err);
    await db.query(
      `UPDATE jobs SET status = $1, error_message = $2, updated_at = NOW() WHERE id = $3`,
      ['failed', err.message, job.data.job_id]
    );
    throw err;
  }
}, {
  connection: {
    host: 'redis',
    port: 6379,
    maxRetriesPerRequest: null,
  },
  concurrency: 2,
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

console.log('Worker started, listening for jobs...');
console.log(`Redis URL: ${REDIS_URL}`);
console.log(`Database: ${process.env.DB_NAME}`);

process.on('SIGTERM', async () => {
  await worker.close();
  await db.end();
  process.exit(0);
});
