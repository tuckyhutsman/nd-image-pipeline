// Slider Hint Configuration - Maps value ranges to algorithm info with color gradients
// Colors: Green (fastest) → Blue (balanced) → Orange → Red (slowest/smallest)
// Color scheme driven by actual algorithmic transitions in worker.js

/**
 * Define algorithm transitions and visual hints for different compression ranges
 * Colors reflect processing intensity: Green (fast) → Red (intensive)
 */

// PNG COMPRESSION HINTS (0-100 scale)
// 3 distinct algorithms: Sharp → pngcrush-max → pngcrush-brute
export const PNG_COMPRESSION_HINTS = {
  ranges: [
    {
      min: 0,
      max: 70,
      label: 'Sharp lossless compression',
      sublabel: 'fastest/largest',
      algorithm: 'sharp',
      color: '#00AA44', // Green
      weight: 'regular',
    },
    {
      min: 71,
      max: 85,
      label: 'pngcrush maximum compression',
      sublabel: 'high compression',
      algorithm: 'pngcrush',
      color: '#0066CC', // Blue
      weight: 'regular',
    },
    {
      min: 86,
      max: 100,
      label: 'pngcrush brute force compression',
      sublabel: 'slowest/smallest',
      algorithm: 'pngcrush',
      color: '#FF6600', // Orange-Red
      weight: 'regular',
    },
  ],
};

// PNG8 COMPRESSION HINTS (0-100 scale)
// 2 distinct algorithms: Sharp palette → pngquant
export const PNG8_COMPRESSION_HINTS = {
  ranges: [
    {
      min: 0,
      max: 60,
      label: 'Sharp indexed color',
      sublabel: 'fastest/largest',
      algorithm: 'sharp',
      color: '#00AA44', // Green
      weight: 'regular',
    },
    {
      min: 61,
      max: 100,
      label: 'pngquant color reduction',
      sublabel: 'slowest/smallest',
      algorithm: 'pngquant',
      color: '#FF3333', // Red
      weight: 'regular',
    },
  ],
};

// JPEG QUALITY HINTS (0-100 scale for Quality slider)
// Quality affects visual detail, not algorithm choice
export const JPEG_QUALITY_HINTS = {
  ranges: [
    {
      min: 0,
      max: 30,
      label: 'Very low quality',
      sublabel: 'smallest files',
      algorithm: 'mozjpeg',
      color: '#FF3333', // Red
      weight: 'regular',
    },
    {
      min: 31,
      max: 60,
      label: 'Moderate quality',
      sublabel: 'balanced',
      algorithm: 'mozjpeg',
      color: '#FF9500', // Orange
      weight: 'regular',
    },
    {
      min: 61,
      max: 85,
      label: 'Good quality',
      sublabel: 'recommended',
      algorithm: 'mozjpeg',
      color: '#0066CC', // Blue
      weight: 'regular',
    },
    {
      min: 86,
      max: 100,
      label: 'High quality',
      sublabel: 'largest files',
      algorithm: 'mozjpeg',
      color: '#00AA44', // Green
      weight: 'regular',
    },
  ],
};

// JPEG COMPRESSION HINTS (0-100 scale for Compression slider)
// 4 distinct quantization strategies - MOST GRANULAR
export const JPEG_COMPRESSION_HINTS = {
  ranges: [
    {
      min: 0,
      max: 29,
      label: 'Most aggressive compression',
      sublabel: 'fastest',
      algorithm: 'mozjpeg',
      color: '#00AA44', // Green
      weight: 'semibold',
      config: 'quantTable=4, optimizeScans=false',
    },
    {
      min: 30,
      max: 60,
      label: 'Aggressive compression',
      sublabel: 'medium',
      algorithm: 'mozjpeg',
      color: '#0066CC', // Blue
      weight: 'semibold',
      config: 'quantTable=3, optimizeScans=true',
    },
    {
      min: 61,
      max: 85,
      label: 'Balanced compression',
      sublabel: 'high effort',
      algorithm: 'mozjpeg',
      color: '#FF9500', // Orange
      weight: 'semibold',
      config: 'quantTable=2, optimizeScans=true',
    },
    {
      min: 86,
      max: 100,
      label: 'Conservative compression',
      sublabel: 'slowest/smallest',
      algorithm: 'mozjpeg',
      color: '#FF3333', // Red
      weight: 'semibold',
      config: 'quantTable=1, optimizeScans=true',
    },
  ],
};

// WEBP QUALITY HINTS (0-100 scale)
// Quality affects visual detail, algorithm is consistent
export const WEBP_QUALITY_HINTS = {
  ranges: [
    {
      min: 0,
      max: 30,
      label: 'Very low quality',
      sublabel: 'smallest files',
      algorithm: 'webp',
      color: '#FF3333', // Red
      weight: 'regular',
    },
    {
      min: 31,
      max: 60,
      label: 'Moderate quality',
      sublabel: 'balanced',
      algorithm: 'webp',
      color: '#FF9500', // Orange
      weight: 'regular',
    },
    {
      min: 61,
      max: 85,
      label: 'Good quality',
      sublabel: 'recommended',
      algorithm: 'webp',
      color: '#0066CC', // Blue
      weight: 'regular',
    },
    {
      min: 86,
      max: 100,
      label: 'High quality',
      sublabel: 'largest files',
      algorithm: 'webp',
      color: '#00AA44', // Green
      weight: 'regular',
    },
  ],
};

// WEBP COMPRESSION HINTS (0-100 scale for effort)
// Single algorithm, 6 effort levels (intensity parameter)
export const WEBP_COMPRESSION_HINTS = {
  ranges: [
    {
      min: 0,
      max: 16,
      label: 'Effort level 0',
      sublabel: 'fastest',
      algorithm: 'webp',
      color: '#00AA44', // Green
      weight: 'semibold',
    },
    {
      min: 17,
      max: 33,
      label: 'Effort level 1-2',
      sublabel: 'fast',
      algorithm: 'webp',
      color: '#44BB44', // Light Green
      weight: 'semibold',
    },
    {
      min: 34,
      max: 50,
      label: 'Effort level 3',
      sublabel: 'medium',
      algorithm: 'webp',
      color: '#0066CC', // Blue
      weight: 'semibold',
    },
    {
      min: 51,
      max: 66,
      label: 'Effort level 4',
      sublabel: 'high',
      algorithm: 'webp',
      color: '#FF9500', // Orange
      weight: 'semibold',
    },
    {
      min: 67,
      max: 83,
      label: 'Effort level 5',
      sublabel: 'higher',
      algorithm: 'webp',
      color: '#FF6600', // Red-Orange
      weight: 'semibold',
    },
    {
      min: 84,
      max: 100,
      label: 'Effort level 6',
      sublabel: 'slowest/smallest',
      algorithm: 'webp',
      color: '#FF3333', // Red
      weight: 'semibold',
    },
  ],
};

/**
 * Get hint for a specific value within a hint configuration
 * @param {number} value - The value (0-100)
 * @param {object} hintConfig - The hint configuration object
 * @returns {object} The hint for this value range
 */
export function getSliderHint(value, hintConfig) {
  const hint = hintConfig.ranges.find(r => value >= r.min && value <= r.max);
  return hint || hintConfig.ranges[0]; // Fallback to first range
}

/**
 * Get color for a specific value
 * @param {number} value - Current value (0-100)
 * @param {object} hintConfig - The hint configuration
 * @returns {string} Hex color
 */
export function interpolateSliderColor(value, hintConfig) {
  const hint = getSliderHint(value, hintConfig);
  return hint.color;
}

/**
 * Calculate the position percentage for hint display
 * @param {number} value - The slider value (0-100)
 * @returns {string} CSS percentage for positioning
 */
export function getHintPositionPercentage(value) {
  return `${value}%`;
}
