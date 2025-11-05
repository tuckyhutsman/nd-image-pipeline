// frontend/src/components/SliderWithHint.js
// Clean slider with continuous color feedback - all elements change color together

import React from 'react';
import { getSliderHint } from '../utils/sliderHints';
import './SliderWithHint.css';

/**
 * SliderWithHint Component
 * 
 * Clean slider design with continuous color feedback:
 * - Slider thumb, value box, and hint text all change color together
 * - Color interpolates smoothly between algorithm breakpoints
 * - Algorithm name in bold monospace
 * - Performance badge with outline
 */
const SliderWithHint = ({
  value,
  onChange,
  label,
  hintConfig,
  className = '',
}) => {
  if (!hintConfig || !hintConfig.ranges) {
    throw new Error('SliderWithHint requires valid hintConfig with ranges');
  }

  const currentHint = getSliderHint(value, hintConfig);
  
  // Interpolate color between breakpoints for smooth transitions
  const color = interpolateColor(value, hintConfig);

  return (
    <div className={`slider-with-hint ${className}`}>
      {/* Label */}
      <div className="slider-label-row">
        <label className="slider-label">{label}</label>
      </div>

      {/* Slider */}
      <div className="slider-container">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="slider-input"
          style={{
            '--thumb-color': color,
          }}
        />
      </div>

      {/* Hint Display: Algorithm + Badge (LEFT) | Value Box (RIGHT) */}
      <div className="slider-hint-row">
        <div className="hint-left">
          <span
            className="hint-algorithm"
            style={{ color }}
          >
            {currentHint.algorithm}
          </span>
          <span className="hint-label">{currentHint.label}</span>
          <span
            className="hint-badge"
            style={{
              color,
              borderColor: color,
            }}
          >
            {currentHint.sublabel}
          </span>
        </div>
        <div
          className="slider-value-box"
          style={{ backgroundColor: color }}
        >
          <span className="slider-value">{Math.round(value)}</span>
        </div>
      </div>

      {/* Description */}
      <small className="slider-description">
        {label.includes('Compression') 
          ? 'Higher = smaller file, slower processing. Lossless compression (no detail loss).'
          : 'Controls detail preservation and visual quality.'}
      </small>
    </div>
  );
};

/**
 * Interpolate color between range breakpoints for smooth transitions
 */
function interpolateColor(value, hintConfig) {
  const { ranges } = hintConfig;
  
  // Find current range
  const currentRange = ranges.find(r => value >= r.min && value <= r.max);
  if (!currentRange) return ranges[0].color;
  
  // If at boundaries or single-color range, return exact color
  if (ranges.length === 1 || value === currentRange.min || value === currentRange.max) {
    return currentRange.color;
  }
  
  // Find next range for interpolation
  const currentIndex = ranges.findIndex(r => r === currentRange);
  const nextRange = ranges[currentIndex + 1];
  
  // If no next range, return current color
  if (!nextRange) return currentRange.color;
  
  // Calculate interpolation factor (0 to 1) within current range
  const rangeSize = currentRange.max - currentRange.min;
  const positionInRange = value - currentRange.min;
  const factor = positionInRange / rangeSize;
  
  // Interpolate between current and next color
  return lerpColor(currentRange.color, nextRange.color, factor);
}

/**
 * Linear interpolation between two hex colors
 */
function lerpColor(color1, color2, factor) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  const r = Math.round(c1.r + (c2.r - c1.r) * factor);
  const g = Math.round(c1.g + (c2.g - c1.g) * factor);
  const b = Math.round(c1.b + (c2.b - c1.b) * factor);
  
  return rgbToHex(r, g, b);
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join('');
}

export default SliderWithHint;
