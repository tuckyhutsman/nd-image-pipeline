import React, { useState, useCallback } from 'react';
import './JobSubmit.css';

const JobSubmit = ({ pipelines, onJobSubmitted }) => {
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);

  const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_BATCH_SIZE = 100;

  // Validate file
  const validateFile = (file) => {
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return `${file.name}: Invalid format. Accepted: JPEG, PNG, WebP, TIFF`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File too large (max 50MB)`;
    }
    return null;
  };

  // Handle file input change
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  // Process selected files
  const processFiles = (newFiles) => {
    const errors = [];
    const validFiles = [];

    newFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (selectedFiles.length + validFiles.length > MAX_BATCH_SIZE) {
      errors.push(`Total files cannot exceed ${MAX_BATCH_SIZE}`);
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    setError('');
    setSelectedFiles([...selectedFiles, ...validFiles]);
  };

  // Handle drag and drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const files = Array.from(e.dataTransfer.files || []);
    processFiles(files);
  }, [selectedFiles]);

  // Remove file from selection
  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
    });
  };

  // Submit jobs
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPipeline) {
      setError('Please select a pipeline');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please select at least one file');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Convert files to base64
      const filesData = await Promise.all(
        selectedFiles.map(async (file, index) => {
          const base64 = await fileToBase64(file);
          setUploadProgress(prev => ({
            ...prev,
            [index]: 'Converting...',
          }));
          return {
            file_name: file.name,
            file_data: base64,
          };
        })
      );

      // Use batch endpoint if multiple files, otherwise use single endpoint
      const endpoint = selectedFiles.length > 1 ? '/api/jobs/batch' : '/api/jobs';
      const payload = selectedFiles.length > 1
        ? { pipeline_id: selectedPipeline, files: filesData }
        : filesData[0];

      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}${endpoint}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: selectedFiles.length > 1
          ? JSON.stringify({ pipeline_id: selectedPipeline, files: filesData })
          : JSON.stringify({ pipeline_id: selectedPipeline, ...filesData[0] }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Clear selection
      setSelectedFiles([]);
      setUploadProgress({});

      // Notify parent component
      if (onJobSubmitted) {
        onJobSubmitted(result);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="job-submit-container">
      <h2>Submit Images for Processing</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Pipeline Selection */}
        <div className="form-group">
          <label htmlFor="pipeline">Select Pipeline:</label>
          <select
            id="pipeline"
            value={selectedPipeline}
            onChange={(e) => setSelectedPipeline(e.target.value)}
            disabled={isLoading}
          >
            <option value="">-- Choose a pipeline --</option>
            {pipelines.map(pipeline => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
        </div>

        {/* Drag-Drop Zone */}
        <div
          className={`drag-drop-zone ${isDragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="drag-drop-content">
            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="drag-drop-title">
              Drag images here or click to browse
            </p>
            <p className="drag-drop-hint">
              Supported: JPEG, PNG, WebP, TIFF (max 50MB each)
            </p>
            <input
              type="file"
              multiple
              accept={ACCEPTED_FORMATS.join(',')}
              onChange={handleFileSelect}
              className="file-input"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="selected-files">
            <h3>Selected Files ({selectedFiles.length})</h3>
            <ul>
              {selectedFiles.map((file, index) => (
                <li key={index} className="file-item">
                  <div className="file-info">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  {uploadProgress[index] && (
                    <span className="file-status">{uploadProgress[index]}</span>
                  )}
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeFile(index)}
                    disabled={isLoading}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-btn"
          disabled={isLoading || selectedFiles.length === 0 || !selectedPipeline}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Uploading... ({selectedFiles.length} files)
            </>
          ) : (
            `Submit ${selectedFiles.length} File${selectedFiles.length !== 1 ? 's' : ''}`
          )}
        </button>
      </form>
    </div>
  );
};

export default JobSubmit;