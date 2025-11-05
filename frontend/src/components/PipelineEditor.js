import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './PipelineEditor.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Pipeline types
const PIPELINE_TYPES = {
  SINGLE_ASSET: 'single_asset',
  MULTI_ASSET: 'multi_asset',
};

// Single asset pipeline settings
const ASPECT_RATIOS = [
  { label: 'None (Native)', value: null },
  { label: '1:1 (Square)', value: '1:1' },
  { label: '4:3 (Standard)', value: '4:3' },
  { label: '16:9 (Widescreen)', value: '16:9' },
  { label: '3:2 (Photography)', value: '3:2' },
  { label: '16:10 (Web)', value: '16:10' },
  { label: 'Custom', value: 'custom' },
];

const IMAGE_FORMATS = [
  { label: 'PNG 24-bit (Transparent)', value: 'png' },
  { label: 'PNG 8-bit (Indexed)', value: 'png8' },
  { label: 'JPEG (No Transparency)', value: 'jpeg' },
  { label: 'WebP', value: 'webp' },
];

const ICC_PROFILES = [
  { label: 'sRGB', value: 'sRGB' },
  { label: 'Adobe RGB', value: 'AdobeRGB' },
  { label: 'Display P3', value: 'P3' },
];

const ICC_OPERATIONS = [
  { label: 'Preserve Original', value: 'preserve' },
  { label: 'Assign Profile', value: 'assign' },
  { label: 'Convert to Profile', value: 'convert' },
  { label: 'Remove Profile', value: 'remove' },
];

const ICC_HANDLING = [
  { label: 'Embed Full Profile', value: 'embed' },
  { label: 'Tag Profile Name', value: 'tag' },
  { label: 'Omit Profile Info', value: 'omit' },
];

const OUTPUT_ARRANGEMENTS = [
  {
    value: 'flat',
    label: 'Flat Directory',
    description: 'All outputs in single directory (PL_XXX_2025_11_05)',
  },
  {
    value: 'by_asset_type',
    label: 'By Asset Type',
    description: 'Subdirectories for each asset type (_web, _hero, _highres)',
  },
  {
    value: 'by_input_file',
    label: 'By Input File',
    description: 'Each input file gets its own subdirectory',
  },
];

// Preset templates
const PRESET_TEMPLATES = {
  web_standard: {
    name: 'Web Standard',
    description: '1000px web-optimized PNG',
    type: PIPELINE_TYPES.SINGLE_ASSET,
    suffix: '_web',
    sizing: {
      aspectRatio: null,
      width: 1000,
      height: null,
      dpi: 72,
      resampleIfNeeded: false,
    },
    format: {
      type: 'png',
      quality: 85,
      compression: 66,
    },
    color: {
      changeICC: 'convert',
      destICC: 'sRGB',
      gammaCorrect: true,
    },
    transparency: {
      preserve: true,
      background: '#FFFFFF',
    },
    iccHandling: 'embed',
    resizeFilter: 'Lanczos',
  },
  social_square: {
    name: 'Social Square',
    description: '1200px square JPG for social media',
    type: PIPELINE_TYPES.SINGLE_ASSET,
    suffix: '_social',
    sizing: {
      aspectRatio: '1:1',
      width: 1200,
      height: 1200,
      dpi: 72,
      resampleIfNeeded: false,
    },
    format: {
      type: 'jpeg',
      quality: 80,
      compression: 50,
    },
    color: {
      changeICC: 'convert',
      destICC: 'sRGB',
      gammaCorrect: true,
    },
    transparency: {
      preserve: false,
      background: '#FFFFFF',
    },
    iccHandling: 'tag',
    resizeFilter: 'Lanczos',
  },
  hero_banner: {
    name: 'Hero Banner',
    description: '16:9 Hero image @ 2000px wide',
    type: PIPELINE_TYPES.SINGLE_ASSET,
    suffix: '_hero',
    sizing: {
      aspectRatio: '16:9',
      width: 2000,
      height: 1125,
      dpi: 72,
      resampleIfNeeded: false,
    },
    format: {
      type: 'jpeg',
      quality: 85,
      compression: 50,
    },
    color: {
      changeICC: 'convert',
      destICC: 'sRGB',
      gammaCorrect: true,
    },
    transparency: {
      preserve: false,
      background: '#000000',
    },
    iccHandling: 'embed',
    resizeFilter: 'Lanczos',
  },
  print_highres: {
    name: 'Print High Res',
    description: 'High-resolution PNG for print (300 DPI)',
    type: PIPELINE_TYPES.SINGLE_ASSET,
    suffix: '_print',
    sizing: {
      aspectRatio: null,
      width: null,
      height: null,
      dpi: 300,
      resampleIfNeeded: false,
    },
    format: {
      type: 'png',
      quality: 100,
      compression: 100,
    },
    color: {
      changeICC: 'convert',
      destICC: 'AdobeRGB',
      gammaCorrect: true,
    },
    transparency: {
      preserve: true,
      background: '#FFFFFF',
    },
    iccHandling: 'embed',
    resizeFilter: 'Lanczos',
  },
};

// ISSUE #1 FIX: Accept onPipelineSaved callback from parent
function PipelineEditor({ onPipelineSaved }) {
  const [pipelines, setPipelines] = useState([]);
  const [mode, setMode] = useState('list');
  const [editingId, setEditingId] = useState(null);
  const [pipelineType, setPipelineType] = useState(PIPELINE_TYPES.SINGLE_ASSET);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [singleAssetForm, setSingleAssetForm] = useState({
    name: '',
    description: '',
    suffix: '',
    sizing: {
      aspectRatio: null,
      width: 1000,
      height: null,
      dpi: 72,
      resampleIfNeeded: false,
    },
    format: {
      type: 'png',
      quality: 85,
      compression: 66,
    },
    color: {
      changeICC: 'preserve',
      destICC: 'sRGB',
      gammaCorrect: true,
    },
    transparency: {
      preserve: true,
      background: '#FFFFFF',
    },
    iccHandling: 'embed',
    resizeFilter: 'Lanczos',
  });

  const [multiAssetForm, setMultiAssetForm] = useState({
    name: '',
    description: '',
    components: [],
    outputArrangement: 'flat',
  });

  useEffect(() => {
    fetchPipelines();
  }, []);

  const fetchPipelines = async () => {
    try {
      const response = await axios.get(`${API_URL}/pipelines`);
      setPipelines(response.data);
    } catch (err) {
      setError('Failed to load pipelines: ' + err.message);
    }
  };

  const handleSaveSingleAsset = async (e) => {
    e.preventDefault();
    
    if (!singleAssetForm.name.trim()) {
      setError('Pipeline name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: singleAssetForm.name,
        customer_id: 'default',
        config: {
          type: PIPELINE_TYPES.SINGLE_ASSET,
          ...singleAssetForm,
        },
      };

      if (editingId) {
        await axios.put(`${API_URL}/pipelines/${editingId}`, payload);
        setSuccess('Pipeline updated');
      } else {
        await axios.post(`${API_URL}/pipelines`, payload);
        setSuccess('Pipeline created');
      }

      setSingleAssetForm({
        name: '',
        description: '',
        suffix: '',
        sizing: { aspectRatio: null, width: 1000, height: null, dpi: 72, resampleIfNeeded: false },
        format: { type: 'png', quality: 85, compression: 66 },
        color: { changeICC: 'preserve', destICC: 'sRGB', gammaCorrect: true },
        transparency: { preserve: true, background: '#FFFFFF' },
        iccHandling: 'embed',
        resizeFilter: 'Lanczos',
      });

      setEditingId(null);
      setMode('list');
      
      // Refresh pipelines list
      await fetchPipelines();
      
      setTimeout(() => setSuccess(''), 1500);
      
      // ISSUE #1 FIX: Call parent callback instead of page reload to preserve tab state
      if (onPipelineSaved) {
        setTimeout(() => onPipelineSaved(), 1800);
      }
    } catch (err) {
      setError('Error saving pipeline: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyTemplate = (templateKey) => {
    const template = PRESET_TEMPLATES[templateKey];
    setSingleAssetForm({
      name: template.name,
      description: template.description,
      suffix: template.suffix,
      sizing: template.sizing,
      format: template.format,
      color: template.color,
      transparency: template.transparency,
      iccHandling: template.iccHandling,
      resizeFilter: template.resizeFilter,
    });
    setMode('create-single');
    setSuccess(`Loaded template: ${template.name}`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleEdit = (pipeline) => {
    const config = typeof pipeline.config === 'string' ? JSON.parse(pipeline.config) : pipeline.config;
    
    if (config.type === PIPELINE_TYPES.SINGLE_ASSET) {
      setSingleAssetForm({
        name: pipeline.name,
        description: config.description || '',
        suffix: config.suffix || '',
        sizing: config.sizing || {},
        format: config.format || {},
        color: config.color || {},
        transparency: config.transparency || {},
        iccHandling: config.iccHandling || 'embed',
        resizeFilter: config.resizeFilter || 'Lanczos',
      });
      setMode('create-single');
    } else {
      setMultiAssetForm({
        name: pipeline.name,
        description: config.description || '',
        components: config.components || [],
        outputArrangement: config.outputArrangement || 'flat',
      });
      setMode('create-multi');
    }

    setEditingId(pipeline.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this pipeline?')) return;

    try {
      await axios.delete(`${API_URL}/pipelines/${id}`);
      setSuccess('Pipeline deleted');
      fetchPipelines();
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Error deleting pipeline: ' + err.message);
    }
  };

  // Render list view
  if (mode === 'list') {
    return (
      <div className="pipeline-editor">
        <div className="editor-header">
          <h2>Pipeline Editor</h2>
          <div className="header-buttons">
            <button className="btn btn-primary" onClick={() => { setMode('create-single'); setPipelineType(PIPELINE_TYPES.SINGLE_ASSET); }}>
              + Single Asset
            </button>
            <button className="btn btn-primary" onClick={() => { setMode('create-multi'); setPipelineType(PIPELINE_TYPES.MULTI_ASSET); }}>
              + Multi Asset
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="templates-section">
          <h3>Quick Start Templates</h3>
          <div className="template-grid">
            {Object.entries(PRESET_TEMPLATES).map(([key, template]) => (
              <button
                key={key}
                className="template-card"
                onClick={() => handleApplyTemplate(key)}
              >
                <div className="template-name">{template.name}</div>
                <div className="template-desc">{template.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="pipelines-section">
          <h3>Your Pipelines ({pipelines.length})</h3>
          {pipelines.length === 0 ? (
            <p className="empty-message">No pipelines yet. Create one or use a template above!</p>
          ) : (
            <div className="pipeline-list">
              {pipelines.map((pipeline) => {
                const config = typeof pipeline.config === 'string' ? JSON.parse(pipeline.config) : pipeline.config;
                return (
                  <div key={pipeline.id} className="pipeline-item">
                    <div className="pipeline-info">
                      <h4>{pipeline.name}</h4>
                      <p className="pipeline-type">{config.type === PIPELINE_TYPES.SINGLE_ASSET ? 'Single Asset' : 'Multi Asset'}</p>
                      {config.description && <p className="pipeline-desc">{config.description}</p>}
                    </div>
                    <div className="pipeline-actions">
                      <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(pipeline)}>
                        Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(pipeline.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render single-asset editor
  if (mode === 'create-single') {
    return (
      <div className="pipeline-editor">
        <div className="editor-header">
          <h2>{editingId ? 'Edit' : 'Create'} Single Asset Pipeline</h2>
          <button className="btn btn-secondary" onClick={() => { setMode('list'); setEditingId(null); }}>
            Back to List
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSaveSingleAsset} className="pipeline-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label>Pipeline Name *</label>
              <input
                type="text"
                value={singleAssetForm.name}
                onChange={(e) => setSingleAssetForm({...singleAssetForm, name: e.target.value})}
                placeholder="e.g., Web Standard"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={singleAssetForm.description}
                onChange={(e) => setSingleAssetForm({...singleAssetForm, description: e.target.value})}
                placeholder="What is this pipeline for?"
              />
            </div>

            <div className="form-group">
              <label>Output Suffix</label>
              <input
                type="text"
                value={singleAssetForm.suffix}
                onChange={(e) => setSingleAssetForm({...singleAssetForm, suffix: e.target.value})}
                placeholder="e.g., _web"
              />
              <small>Added to filename before extension</small>
            </div>
          </div>

          <div className="form-section">
            <h3>Sizing & Dimensions</h3>

            <div className="form-row">
              <div className="form-group">
                <label>Aspect Ratio</label>
                <select
                  value={singleAssetForm.sizing.aspectRatio || ''}
                  onChange={(e) => setSingleAssetForm({
                    ...singleAssetForm,
                    sizing: {...singleAssetForm.sizing, aspectRatio: e.target.value || null}
                  })}
                >
                  {ASPECT_RATIOS.map(ar => (
                    <option key={ar.value} value={ar.value || ''}>{ar.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Width (pixels)</label>
                <input
                  type="number"
                  value={singleAssetForm.sizing.width || ''}
                  onChange={(e) => setSingleAssetForm({
                    ...singleAssetForm,
                    sizing: {...singleAssetForm.sizing, width: e.target.value ? parseInt(e.target.value) : null}
                  })}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Height (pixels)</label>
                <input
                  type="number"
                  value={singleAssetForm.sizing.height || ''}
                  onChange={(e) => setSingleAssetForm({
                    ...singleAssetForm,
                    sizing: {...singleAssetForm.sizing, height: e.target.value ? parseInt(e.target.value) : null}
                  })}
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>DPI (Metadata)</label>
                <input
                  type="number"
                  value={singleAssetForm.sizing.dpi}
                  onChange={(e) => setSingleAssetForm({
                    ...singleAssetForm,
                    sizing: {...singleAssetForm.sizing, dpi: parseInt(e.target.value)}
                  })}
                  min="1"
                />
                <small>Does not resample, only sets pixel density metadata</small>
              </div>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={singleAssetForm.sizing.resampleIfNeeded}
                  onChange={(e) => setSingleAssetForm({
                    ...singleAssetForm,
                    sizing: {...singleAssetForm.sizing, resampleIfNeeded: e.target.checked}
                  })}
                />
                Allow upsampling if image is too small
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Format & Quality</h3>

            <div className="form-group">
              <label>Format</label>
              <select
                value={singleAssetForm.format.type}
                onChange={(e) => setSingleAssetForm({
                  ...singleAssetForm,
                  format: {...singleAssetForm.format, type: e.target.value}
                })}
              >
                {IMAGE_FORMATS.map(fmt => (
                  <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
                ))}
              </select>
            </div>

            {/* Quality (Lossy) - shown for JPEG and WebP */}
            {['jpeg', 'webp'].includes(singleAssetForm.format.type) && (
              <div className="form-group">
                <div className="slider-header">
                  <label>Quality (Lossy) — 0-100</label>
                  <span className="slider-value">{singleAssetForm.format.quality}</span>
                </div>
                <input
                  type="range"
                  value={singleAssetForm.format.quality}
                  onChange={(e) => setSingleAssetForm({
                    ...singleAssetForm,
                    format: {...singleAssetForm.format, quality: parseInt(e.target.value)}
                  })}
                  min="0"
                  max="100"
                  className="quality-slider"
                />
                <small>Higher = better quality, larger file. Controls lossy compression (detail loss).</small>
              </div>
            )}

            {/* Compression (Lossless) - shown for PNG and PNG8 */}
            {['png', 'png8'].includes(singleAssetForm.format.type) && (
              <div className="form-group">
                <div className="slider-header">
                  <label>Compression (Lossless) — 0-100</label>
                  <span className="slider-value">{singleAssetForm.format.compression}</span>
                </div>
                <input
                  type="range"
                  value={singleAssetForm.format.compression}
                  onChange={(e) => setSingleAssetForm({
                    ...singleAssetForm,
                    format: {...singleAssetForm.format, compression: parseInt(e.target.value)}
                  })}
                  min="0"
                  max="100"
                  className="compression-slider"
                />
                <small>Higher = smaller file, slower processing. Controls lossless compression (no detail loss).</small>
              </div>
            )}

            {/* WebP supports both */}
            {singleAssetForm.format.type === 'webp' && (
              <div className="form-group">
                <div className="slider-header">
                  <label>Lossless Compression — 0-100</label>
                  <span className="slider-value">{singleAssetForm.format.compression}</span>
                </div>
                <input
                  type="range"
                  value={singleAssetForm.format.compression}
                  onChange={(e) => setSingleAssetForm({
                    ...singleAssetForm,
                    format: {...singleAssetForm.format, compression: parseInt(e.target.value)}
                  })}
                  min="0"
                  max="100"
                  className="compression-slider"
                />
                <small>Additional lossless optimization (WebP already has lossy Quality above).</small>
              </div>
            )}

            {/* Format info box */}
            <div className="format-info-box">
              {singleAssetForm.format.type === 'png' && (
                <div>
                  <strong>📌 PNG 24-bit</strong> — Lossless. Perfect for graphics with transparency. Compression slider controls file size.
                </div>
              )}
              {singleAssetForm.format.type === 'png8' && (
                <div>
                  <strong>📌 PNG 8-bit</strong> — Indexed palette (max 256 colors). Smaller files. Great for simple graphics with transparency.
                </div>
              )}
              {singleAssetForm.format.type === 'jpeg' && (
                <div>
                  <strong>📌 JPEG</strong> — Lossy compression (optimized with mozjpeg). No transparency. Quality slider controls detail preservation.
                </div>
              )}
              {singleAssetForm.format.type === 'webp' && (
                <div>
                  <strong>📌 WebP</strong> — Modern format supporting both lossy and lossless. Best compatibility with modern browsers.
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>Color & ICC Profile</h3>

            <div className="form-row">
              <div className="form-group">
                <label>ICC Profile Handling</label>
                <select
                  value={singleAssetForm.color.changeICC}
                  onChange={(e) => setSingleAssetForm({
                    ...singleAssetForm,
                    color: {...singleAssetForm.color, changeICC: e.target.value}
                  })}
                >
                  {ICC_OPERATIONS.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>

              {['assign', 'convert'].includes(singleAssetForm.color.changeICC) && (
                <div className="form-group">
                  <label>Destination ICC Profile</label>
                  <select
                    value={singleAssetForm.color.destICC}
                    onChange={(e) => setSingleAssetForm({
                      ...singleAssetForm,
                      color: {...singleAssetForm.color, destICC: e.target.value}
                    })}
                  >
                    {ICC_PROFILES.map(prof => (
                      <option key={prof.value} value={prof.value}>{prof.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>ICC Embedding</label>
                <select
                  value={singleAssetForm.iccHandling}
                  onChange={(e) => setSingleAssetForm({
                    ...singleAssetForm,
                    iccHandling: e.target.value
                  })}
                >
                  {ICC_HANDLING.map(hand => (
                    <option key={hand.value} value={hand.value}>{hand.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={singleAssetForm.color.gammaCorrect}
                  onChange={(e) => setSingleAssetForm({
                    ...singleAssetForm,
                    color: {...singleAssetForm.color, gammaCorrect: e.target.checked}
                  })}
                />
                Apply Gamma Correction
              </label>
            </div>
          </div>

          <div className="form-section">
            <h3>Transparency & Background</h3>

            {/* FIX #3: Only show transparency controls for formats that support it */}
            {['png', 'png8', 'webp'].includes(singleAssetForm.format.type) ? (
              <>
                <div className="form-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={singleAssetForm.transparency.preserve}
                      onChange={(e) => setSingleAssetForm({
                        ...singleAssetForm,
                        transparency: {...singleAssetForm.transparency, preserve: e.target.checked}
                      })}
                    />
                    <span className="toggle-text">
                      {singleAssetForm.transparency.preserve 
                        ? '✓ Preserve transparency from input file' 
                        : '○ Replace transparency with background color'}
                    </span>
                  </label>
                </div>

                {!singleAssetForm.transparency.preserve && (
                  <div className="form-group">
                    <label>Background Color (replaces transparent areas)</label>
                    <div className="color-picker-group">
                      <input
                        type="color"
                        value={singleAssetForm.transparency.background}
                        onChange={(e) => setSingleAssetForm({
                          ...singleAssetForm,
                          transparency: {...singleAssetForm.transparency, background: e.target.value}
                        })}
                        className="color-picker"
                      />
                      <input
                        type="text"
                        value={singleAssetForm.transparency.background}
                        onChange={(e) => setSingleAssetForm({
                          ...singleAssetForm,
                          transparency: {...singleAssetForm.transparency, background: e.target.value}
                        })}
                        placeholder="#FFFFFF"
                        className="color-text"
                      />
                    </div>
                    <small>Hex color in active ICC profile. Default: #FFFFFF (white)</small>
                  </div>
                )}

                <div className="transparency-info">
                  {singleAssetForm.transparency.preserve 
                    ? '✓ Transparent areas will be preserved in the output file'
                    : `○ Transparent areas will be replaced with ${singleAssetForm.transparency.background}`}
                </div>
              </>
            ) : (
              <div className="format-note">
                <strong>ℹ️ {singleAssetForm.format.type === 'jpeg' ? 'JPEG' : singleAssetForm.format.type.toUpperCase()} does not support transparency.</strong>
                {singleAssetForm.format.type === 'jpeg' && (
                  <>
                    <p>Any transparent areas in the input will be replaced with a solid background color.</p>
                    <div className="form-group">
                      <label>Background Color (default for transparent areas)</label>
                      <div className="color-picker-group">
                        <input
                          type="color"
                          value={singleAssetForm.transparency.background}
                          onChange={(e) => setSingleAssetForm({
                            ...singleAssetForm,
                            transparency: {...singleAssetForm.transparency, background: e.target.value}
                          })}
                          className="color-picker"
                        />
                        <input
                          type="text"
                          value={singleAssetForm.transparency.background}
                          onChange={(e) => setSingleAssetForm({
                            ...singleAssetForm,
                            transparency: {...singleAssetForm.transparency, background: e.target.value}
                          })}
                          placeholder="#FFFFFF"
                          className="color-text"
                        />
                      </div>
                      <small>Hex color. Default: #FFFFFF (white)</small>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : editingId ? 'Update Pipeline' : 'Create Pipeline'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => { setMode('list'); setEditingId(null); }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Render multi-asset editor
  if (mode === 'create-multi') {
    return (
      <div className="pipeline-editor">
        <div className="editor-header">
          <h2>Multi-Asset Pipeline</h2>
          <button className="btn btn-secondary" onClick={() => { setMode('list'); setEditingId(null); }}>
            Back to List
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form className="pipeline-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-group">
              <label>Pipeline Name *</label>
              <input
                type="text"
                value={multiAssetForm.name}
                onChange={(e) => setMultiAssetForm({...multiAssetForm, name: e.target.value})}
                placeholder="e.g., Product Assets"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={multiAssetForm.description}
                onChange={(e) => setMultiAssetForm({...multiAssetForm, description: e.target.value})}
                placeholder="What assets does this pipeline create?"
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Output Organization</h3>
            <div className="output-arrangement">
              {OUTPUT_ARRANGEMENTS.map((arr) => (
                <label key={arr.value} className="arrangement-option">
                  <input
                    type="radio"
                    value={arr.value}
                    checked={multiAssetForm.outputArrangement === arr.value}
                    onChange={(e) => setMultiAssetForm({...multiAssetForm, outputArrangement: e.target.value})}
                  />
                  <div className="arrangement-label">
                    <strong>{arr.label}</strong>
                    <small>{arr.description}</small>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h3>Pipeline Components</h3>
            <p className="info">Multi-asset pipelines compose multiple single-asset pipelines. Each input file generates one output per component.</p>
            <p className="placeholder">Component selection UI - coming in next iteration</p>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => { setMode('list'); setEditingId(null); }}>
              Back
            </button>
          </div>
        </form>
      </div>
    );
  }
}

export default PipelineEditor;
