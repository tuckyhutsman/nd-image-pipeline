// frontend/src/components/SliderWithHint.js
// Reusable slider component with dynamic algorithm hints and color feedback

import React from 'react';
import { getSliderHint, interpolateSliderColor } from '../utils/sliderHints';
import './SliderWithHint.css';

/**
 * SliderWithHint Component
 * 
 * Displays a slider with:
 * - Dynamic color feedback (Orange → Blue → Green)
 * - Algorithm name and settings
 * - Performance tradeoff indicator (fastest/largest ↔ slowest/smallest)
 * - Numeric display in rounded box
 * 
 * @param {object} props
 * @param {number} props.value - Current value (0-100)
 * @param {function} props.onChange - Callback when value changes
 * @param {string} props.label - Slider label
 * @param {object} props.hintConfig - Hint configuration (see sliderHints.js)
 * @param {string} props.className - Additional CSS class
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
  const color = interpolateSliderColor(value, hintConfig);

  return (
    <div className={`slider-with-hint ${className}`}>
      {/* Header: Label + Numeric Display */}
      <div className="slider-header">
        <label className="slider-label">{label}</label>
        <div className="slider-value-box">
          <span className="slider-value" style={{ color }}>
            {Math.round(value)}
          </span>
        </div>
      </div>

      {/* Main Slider */}
      <div className="slider-container">
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="slider-input"
          style={{
            background: `linear-gradient(to right, #FF9500 0%, #0066CC 50%, #34C759 100%)`,
          }}
        />
      </div>

      {/* Hint Display: Algorithm + Tradeoff */}
      <div className="slider-hint">
        <div className="hint-left">
          <span
            className="hint-algorithm"
            style={{
              color,
              fontWeight: currentHint.weight === 'semibold' ? '600' : '400',
              fontFamily: 'ui-monospace, Courier, monospace',
            }}
          >
            {currentHint.algorithm}
          </span>
          <span className="hint-label">{currentHint.label}</span>
        </div>
        <div
          className="hint-tradeoff"
          style={{
            color,
            backgroundColor: `${color}20`, // 20% opacity
            borderColor: color,
          }}
        >
          <span className="hint-badge">{currentHint.sublabel}</span>
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

export default SliderWithHint;
