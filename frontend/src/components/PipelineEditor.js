import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const PIPELINE_TYPES = {
  SINGLE_ASSET: 'single_asset',
  MULTI_ASSET: 'multi_asset',
};

const OPERATIONS = {
  RESIZE: 'resize',
  CROP: 'crop',
  FORMAT_CONVERT: 'format_convert',
  COLOR_ADJUST: 'color_adjust',
  WATERMARK: 'watermark',
  THUMBNAIL: 'thumbnail',
  OPTIMIZE: 'optimize',
};

function PipelineEditor() {
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: PIPELINE_TYPES.SINGLE_ASSET,
    customer_id: 'default',
    operations: [],
  });

  // Load pipelines on mount
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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const addOperation = () => {
    setFormData(prev => ({
      ...prev,
      operations: [
        ...prev.operations,
        {
          id: Date.now(),
          type: OPERATIONS.RESIZE,
          enabled: true,
          params: {},
        },
      ],
    }));
  };

  const removeOperation = (operationId) => {
    setFormData(prev => ({
      ...prev,
      operations: prev.operations.filter(op => op.id !== operationId),
    }));
  };

  const updateOperation = (operationId, updates) => {
    setFormData(prev => ({
      ...prev,
      operations: prev.operations.map(op =>
        op.id === operationId ? { ...op, ...updates } : op
      ),
    }));
  };

  const updateOperationParams = (operationId, paramName, paramValue) => {
    setFormData(prev => ({
      ...prev,
      operations: prev.operations.map(op =>
        op.id === operationId
          ? { ...op, params: { ...op.params, [paramName]: paramValue } }
          : op
      ),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Pipeline name is required');
      return;
    }

    if (formData.operations.length === 0) {
      setError('Pipeline must have at least one operation');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: formData.name,
        customer_id: formData.customer_id,
        config: {
          type: formData.type,
          operations: formData.operations,
        },
      };

      if (editingId) {
        await axios.put(`${API_URL}/pipelines/${editingId}`, payload);
        setSuccess('Pipeline updated successfully');
      } else {
        await axios.post(`${API_URL}/pipelines`, payload);
        setSuccess('Pipeline created successfully');
      }

      setFormData({
        name: '',
        type: PIPELINE_TYPES.SINGLE_ASSET,
        customer_id: 'default',
        operations: [],
      });
      setEditingId(null);
      setShowForm(false);
      
      await fetchPipelines();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error saving pipeline: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pipeline) => {
    const config = typeof pipeline.config === 'string' 
      ? JSON.parse(pipeline.config) 
      : pipeline.config;
    
    setFormData({
      name: pipeline.name,
      type: config.type || PIPELINE_TYPES.SINGLE_ASSET,
      customer_id: pipeline.customer_id,
      operations: config.operations || [],
    });
    setEditingId(pipeline.id);
    setShowForm(true);
  };

  const handleDelete = async (pipelineId) => {
    if (!window.confirm('Are you sure you want to delete this pipeline?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/pipelines/${pipelineId}`);
      setSuccess('Pipeline deleted successfully');
      await fetchPipelines();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error deleting pipeline: ' + err.message);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      type: PIPELINE_TYPES.SINGLE_ASSET,
      customer_id: 'default',
      operations: [],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const renderOperationParams = (operation) => {
    switch (operation.type) {
      case OPERATIONS.RESIZE:
        return (
          <div className="operation-params">
            <div className="param-group">
              <label>Width (px)</label>
              <input
                type="number"
                value={operation.params.width || ''}
                onChange={(e) => updateOperationParams(operation.id, 'width', e.target.value)}
                placeholder="Enter width"
                min="1"
              />
            </div>
            <div className="param-group">
              <label>Height (px)</label>
              <input
                type="number"
                value={operation.params.height || ''}
                onChange={(e) => updateOperationParams(operation.id, 'height', e.target.value)}
                placeholder="Enter height"
                min="1"
              />
            </div>
            <div className="param-group">
              <label>Fit Mode</label>
              <select
                value={operation.params.fit || 'cover'}
                onChange={(e) => updateOperationParams(operation.id, 'fit', e.target.value)}
              >
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
                <option value="inside">Inside</option>
                <option value="outside">Outside</option>
              </select>
            </div>
          </div>
        );
      case OPERATIONS.CROP:
        return (
          <div className="operation-params">
            <div className="param-group">
              <label>X Offset (px)</label>
              <input
                type="number"
                value={operation.params.x || 0}
                onChange={(e) => updateOperationParams(operation.id, 'x', e.target.value)}
              />
            </div>
            <div className="param-group">
              <label>Y Offset (px)</label>
              <input
                type="number"
                value={operation.params.y || 0}
                onChange={(e) => updateOperationParams(operation.id, 'y', e.target.value)}
              />
            </div>
            <div className="param-group">
              <label>Width (px)</label>
              <input
                type="number"
                value={operation.params.width || ''}
                onChange={(e) => updateOperationParams(operation.id, 'width', e.target.value)}
                placeholder="Enter width"
                min="1"
              />
            </div>
            <div className="param-group">
              <label>Height (px)</label>
              <input
                type="number"
                value={operation.params.height || ''}
                onChange={(e) => updateOperationParams(operation.id, 'height', e.target.value)}
                placeholder="Enter height"
                min="1"
              />
            </div>
          </div>
        );
      case OPERATIONS.FORMAT_CONVERT:
        return (
          <div className="operation-params">
            <div className="param-group">
              <label>Output Format</label>
              <select
                value={operation.params.format || 'jpeg'}
                onChange={(e) => updateOperationParams(operation.id, 'format', e.target.value)}
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
                <option value="avif">AVIF</option>
                <option value="tiff">TIFF</option>
              </select>
            </div>
            <div className="param-group">
              <label>Quality (1-100)</label>
              <input
                type="number"
                min="1"
                max="100"
                value={operation.params.quality || 80}
                onChange={(e) => updateOperationParams(operation.id, 'quality', e.target.value)}
              />
            </div>
          </div>
        );
      case OPERATIONS.OPTIMIZE:
        return (
          <div className="operation-params">
            <div className="param-group">
              <label>Optimization Level</label>
              <select
                value={operation.params.level || 'balanced'}
                onChange={(e) => updateOperationParams(operation.id, 'level', e.target.value)}
              >
                <option value="low">Low (faster)</option>
                <option value="balanced">Balanced</option>
                <option value="high">High (slower)</option>
              </select>
            </div>
            <div className="param-group">
              <label>Remove Metadata</label>
              <input
                type="checkbox"
                checked={operation.params.removeMetadata || false}
                onChange={(e) => updateOperationParams(operation.id, 'removeMetadata', e.target.checked)}
              />
            </div>
          </div>
        );
      case OPERATIONS.THUMBNAIL:
        return (
          <div className="operation-params">
            <div className="param-group">
              <label>Size (px)</label>
              <input
                type="number"
                value={operation.params.size || 150}
                onChange={(e) => updateOperationParams(operation.id, 'size', e.target.value)}
                min="10"
              />
            </div>
          </div>
        );
      default:
        return <p className="text-muted">No parameters for this operation</p>;
    }
  };

  return (
    <div className="pipeline-editor-container">
      <div className="editor-header">
        <h2>Pipeline Editor</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
          disabled={loading}
        >
          {showForm ? 'Cancel' : '+ Create New Pipeline'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="pipeline-form card">
          <h3>{editingId ? 'Edit Pipeline' : 'Create New Pipeline'}</h3>

          {/* Basic Info */}
          <div className="form-section">
            <h4>Basic Information</h4>
            <div className="form-group">
              <label>Pipeline Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Product Photos - Web"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  <option value={PIPELINE_TYPES.SINGLE_ASSET}>Single Asset</option>
                  <option value={PIPELINE_TYPES.MULTI_ASSET}>Multi Asset</option>
                </select>
              </div>
              <div className="form-group">
                <label>Customer ID</label>
                <input
                  type="text"
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>

          {/* Operations */}
          <div className="form-section">
            <div className="section-header">
              <h4>Processing Operations</h4>
              <button
                type="button"
                className="btn btn-sm btn-success"
                onClick={addOperation}
              >
                + Add Operation
              </button>
            </div>

            {formData.operations.length === 0 ? (
              <p className="text-muted">No operations added yet. Click "Add Operation" to start.</p>
            ) : (
              <div className="operations-list">
                {formData.operations.map((operation, index) => (
                  <div key={operation.id} className="operation-card">
                    <div className="operation-header">
                      <span className="operation-index">Step {index + 1}</span>
                      <div className="operation-controls">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={operation.enabled}
                            onChange={(e) => updateOperation(operation.id, { enabled: e.target.checked })}
                          />
                          Enabled
                        </label>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => removeOperation(operation.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="operation-type">
                      <label>Operation Type</label>
                      <select
                        value={operation.type}
                        onChange={(e) => updateOperation(operation.id, { type: e.target.value })}
                      >
                        {Object.entries(OPERATIONS).map(([key, value]) => (
                          <option key={value} value={value}>
                            {key.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    {renderOperationParams(operation)}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : editingId ? 'Update Pipeline' : 'Create Pipeline'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleReset} disabled={loading}>
              Reset
            </button>
          </div>
        </form>
      )}

      {/* Pipelines List */}
      <div className="pipelines-list">
        <h3>Existing Pipelines ({pipelines.length})</h3>
        {pipelines.length === 0 ? (
          <p className="text-muted">No pipelines created yet. Create one to get started!</p>
        ) : (
          <div className="pipeline-cards">
            {pipelines.map(pipeline => {
              const config = typeof pipeline.config === 'string' 
                ? JSON.parse(pipeline.config) 
                : pipeline.config;
              
              return (
                <div key={pipeline.id} className="pipeline-card">
                  <div className="card-header">
                    <h4>{pipeline.name}</h4>
                    <span className="badge">{config.operations?.length || 0} ops</span>
                  </div>

                  <div className="card-body">
                    <p><strong>Type:</strong> {config.type || 'single_asset'}</p>
                    <p><strong>Customer:</strong> {pipeline.customer_id}</p>
                    <p><strong>Created:</strong> {new Date(pipeline.created_at).toLocaleDateString()}</p>

                    <div className="operations-summary">
                      <strong>Operations:</strong>
                      <ul>
                        {config.operations?.map((op, idx) => (
                          <li key={idx}>
                            {idx + 1}. {op.type.replace(/_/g, ' ').toUpperCase()}
                            {!op.enabled && ' (disabled)'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => handleEdit(pipeline)}
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(pipeline.id)}
                      disabled={loading}
                    >
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

export default PipelineEditor;
