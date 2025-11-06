// frontend/src/components/SliderWithHint.js
// Clean slider with continuous color feedback - all elements change color together

import React from 'react';
import { getSliderHint } from '../utils/sliderHints';
import './SliderWithHint.css';

/**
 * SliderWithHint Component
 * 
 * Clean slider design with continuous color feedback:
 * - Slider thumb, value box, hint text all change color together
 * - Color interpolates smoothly between algorithm breakpoints
 * - Algorithm name in bold monospace (no duplication)
 * - Performance badge with outline (colored)
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
      {/* Label - using form-group label styling */}
      <div className="form-group">
        <label>{label}</label>
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
 * FIXED: Interpolate color based on slider position across ALL ranges
 * 
 * The key insight: We need to interpolate between BREAKPOINTS, not within ranges.
 * 
 * Example with 3 ranges:
 * Range 1: 0-70   (Green)
 * Range 2: 71-85  (Blue) 
 * Range 3: 86-100 (Red)
 * 
 * Color stops at: 0 (Green), 70 (Green), 85 (Blue), 100 (Red)
 * 
 * At value 75 (middle of range 2):
 * - We're between stops 70 (Green) and 85 (Blue)
 * - Progress: (75-70)/(85-70) = 5/15 = 0.33
 * - Color: 33% between Green and Blue
 */
function interpolateColor(value, hintConfig) {
  const { ranges } = hintConfig;
  
  // Build color stops from ranges (at max of each range)
  const colorStops = ranges.map((range, index) => ({
    position: range.max,
    color: range.color,
    isLast: index === ranges.length - 1,
  }));
  
  // Add a stop at position 0 with first color
  colorStops.unshift({
    position: 0,
    color: ranges[0].color,
    isLast: false,
  });
  
  // Find the two stops we're between
  let startStop = colorStops[0];
  let endStop = colorStops[1];
  
  for (let i = 0; i < colorStops.length - 1; i++) {
    if (value >= colorStops[i].position && value <= colorStops[i + 1].position) {
      startStop = colorStops[i];
      endStop = colorStops[i + 1];
      break;
    }
  }
  
  // If we're exactly at a stop, return that color
  if (value === startStop.position) return startStop.color;
  if (value === endStop.position) return endStop.color;
  
  // Calculate interpolation factor between the two stops
  const range = endStop.position - startStop.position;
  const position = value - startStop.position;
  const factor = position / range;
  
  // Interpolate between the two colors
  return lerpColor(startStop.color, endStop.color, factor);
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
