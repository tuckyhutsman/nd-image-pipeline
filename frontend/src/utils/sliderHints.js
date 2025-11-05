// Slider Hint Configuration - Maps value ranges to algorithm info with color gradients

/**
 * Define algorithm transitions and visual hints for different compression ranges
 * Colors: Orange (fastest/largest) → Blue (balanced) → Green (slowest/smallest)
 */

// PNG COMPRESSION HINTS (0-100 scale)
export const PNG_COMPRESSION_HINTS = {
  ranges: [
    {
      min: 0,
      max: 20,
      label: 'Conventional lossless compression',
      sublabel: 'fastest/largest',
      algorithm: 'sharp',
      color: '#FF9500', // Orange
      weight: 'regular',
    },
    {
      min: 21,
      max: 69,
      label: 'pngcrush lossless compression',
      sublabel: 'medium',
      algorithm: 'pngcrush',
      color: '#0066CC', // Blue
      weight: 'regular',
    },
    {
      min: 70,
      max: 85,
      label: 'pngcrush lossless compression',
      sublabel: 'maximum',
      algorithm: 'pngcrush',
      color: '#0099FF', // Light Blue
      weight: 'regular',
    },
    {
      min: 86,
      max: 100,
      label: 'Brute force pngcrush lossless compression',
      sublabel: 'slowest/smallest',
      algorithm: 'pngcrush',
      color: '#34C759', // Green
      weight: 'regular',
    },
  ],
};

// PNG8 COMPRESSION HINTS (0-100 scale)
export const PNG8_COMPRESSION_HINTS = {
  ranges: [
    {
      min: 0,
      max: 20,
      label: 'Conventional indexed color',
      sublabel: 'fastest/largest',
      algorithm: 'sharp',
      color: '#FF9500', // Orange
      weight: 'regular',
    },
    {
      min: 21,
      max: 60,
      label: 'pngquant indexed color',
      sublabel: 'medium',
      algorithm: 'pngquant',
      color: '#0066CC', // Blue
      weight: 'regular',
    },
    {
      min: 61,
      max: 100,
      label: 'pngquant indexed color',
      sublabel: 'slowest/smallest',
      algorithm: 'pngquant',
      color: '#34C759', // Green
      weight: 'regular',
    },
  ],
};

// JPEG QUALITY HINTS (0-100 scale for Quality slider)
export const JPEG_QUALITY_HINTS = {
  ranges: [
    {
      min: 0,
      max: 30,
      label: 'Very low quality',
      sublabel: 'smallest files',
      algorithm: 'mozjpeg',
      color: '#FF9500', // Orange
      weight: 'regular',
    },
    {
      min: 31,
      max: 60,
      label: 'Moderate quality',
      sublabel: 'balanced',
      algorithm: 'mozjpeg',
      color: '#0066CC', // Blue
      weight: 'regular',
    },
    {
      min: 61,
      max: 85,
      label: 'Good quality',
      sublabel: 'recommended',
      algorithm: 'mozjpeg',
      color: '#0099FF', // Light Blue
      weight: 'regular',
    },
    {
      min: 86,
      max: 100,
      label: 'High quality',
      sublabel: 'largest files',
      algorithm: 'mozjpeg',
      color: '#34C759', // Green
      weight: 'regular',
    },
  ],
};

// JPEG COMPRESSION HINTS (0-100 scale for Compression slider)
export const JPEG_COMPRESSION_HINTS = {
  ranges: [
    {
      min: 0,
      max: 29,
      label: 'Very aggressive compression',
      sublabel: 'fastest/largest',
      algorithm: 'mozjpeg',
      color: '#FF9500', // Orange
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
      sublabel: 'recommended',
      algorithm: 'mozjpeg',
      color: '#0099FF', // Light Blue
      weight: 'semibold',
      config: 'quantTable=2, optimizeScans=true',
    },
    {
      min: 86,
      max: 100,
      label: 'Conservative compression',
      sublabel: 'slowest/smallest',
      algorithm: 'mozjpeg',
      color: '#34C759', // Green
      weight: 'semibold',
      config: 'quantTable=1, optimizeScans=true',
    },
  ],
};

// WEBP QUALITY HINTS (0-100 scale)
export const WEBP_QUALITY_HINTS = {
  ranges: [
    {
      min: 0,
      max: 30,
      label: 'Very low quality',
      sublabel: 'smallest files',
      algorithm: 'webp',
      color: '#FF9500', // Orange
      weight: 'regular',
    },
    {
      min: 31,
      max: 60,
      label: 'Moderate quality',
      sublabel: 'balanced',
      algorithm: 'webp',
      color: '#0066CC', // Blue
      weight: 'regular',
    },
    {
      min: 61,
      max: 85,
      label: 'Good quality',
      sublabel: 'recommended',
      algorithm: 'webp',
      color: '#0099FF', // Light Blue
      weight: 'regular',
    },
    {
      min: 86,
      max: 100,
      label: 'High quality',
      sublabel: 'largest files',
      algorithm: 'webp',
      color: '#34C759', // Green
      weight: 'regular',
    },
  ],
};

// WEBP COMPRESSION HINTS (0-100 scale for effort)
export const WEBP_COMPRESSION_HINTS = {
  ranges: [
    {
      min: 0,
      max: 16,
      label: 'Effort level 0',
      sublabel: 'fastest',
      algorithm: 'webp',
      color: '#FF9500', // Orange
      weight: 'semibold',
    },
    {
      min: 17,
      max: 33,
      label: 'Effort level 1-2',
      sublabel: 'fast',
      algorithm: 'webp',
      color: '#FF9500', // Orange
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
      color: '#0099FF', // Light Blue
      weight: 'semibold',
    },
    {
      min: 67,
      max: 83,
      label: 'Effort level 5',
      sublabel: 'higher',
      algorithm: 'webp',
      color: '#00B348', // Light Green
      weight: 'semibold',
    },
    {
      min: 84,
      max: 100,
      label: 'Effort level 6',
      sublabel: 'slowest/smallest',
      algorithm: 'webp',
      color: '#34C759', // Green
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
 * Interpolate color between two hex colors based on position
 * Used for smooth color gradient across slider
 * @param {number} value - Current value (0-100)
 * @returns {string} Interpolated hex color
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
