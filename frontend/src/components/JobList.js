import React, { useState, useEffect } from 'react';
import apiClient, { buildFullUrl } from '../config/api';
import ConfirmDialog from './ConfirmDialog';
import DropdownMenu from './DropdownMenu';
import './JobList.css';

const JobList = ({ jobs, onRefresh }) => {
  const [downloadingBatches, setDownloadingBatches] = useState(new Set());
  const [batchesData, setBatchesData] = useState(jobs);
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [batchJobs, setBatchJobs] = useState([]);
  const [loadingBatchJobs, setLoadingBatchJobs] = useState(false);
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  // Batch name editing state
  const [editingBatchName, setEditingBatchName] = useState(false);
  const [tempBatchName, setTempBatchName] = useState('');
  const [savingBatchName, setSavingBatchName] = useState(false);

  useEffect(() => {
    setBatchesData(jobs);
  }, [jobs]);

  // Load jobs for a specific batch
  const loadBatchJobs = async (batchId) => {
    setLoadingBatchJobs(true);
    try {
      const response = await apiClient.get(`/jobs/batch/${batchId}`);
      setBatchJobs(response.data);
    } catch (err) {
      console.error('Error loading batch jobs:', err);
      setBatchJobs([]);
    } finally {
      setLoadingBatchJobs(false);
    }
  };

  // Delete entire batch
  const handleDeleteBatch = async (batch) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Batch?',
      message: `Are you sure you want to delete "${batch.base_directory_name}"? This will permanently delete all ${batch.job_count} jobs and their output files. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await apiClient.delete(`/batches/${batch.batch_id}`);
          alert('Batch deleted successfully');
          onRefresh(); // Refresh the list
        } catch (err) {
          console.error('Error deleting batch:', err);
          alert(`Failed to delete batch: ${err.message}`);
        }
      },
    });
  };

  // Delete individual job
  const handleDeleteJob = async (job) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Job?',
      message: `Are you sure you want to delete "${job.input_filename}"? This will permanently delete the job and its output files. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await apiClient.delete(`/jobs/${job.id}`);
          alert('Job deleted successfully');
          // Reload batch jobs
          await loadBatchJobs(selectedBatchId);
          // Refresh the main list
          onRefresh();
        } catch (err) {
          console.error('Error deleting job:', err);
          alert(`Failed to delete job: ${err.message}`);
        }
      },
    });
  };

  // Download batch outputs as ZIP
  const handleDownloadBatch = async (batch) => {
    try {
      setDownloadingBatches(prev => new Set(prev).add(batch.batch_id));

      // Use the batch download endpoint
      const url = buildFullUrl(`/api/batches/${batch.batch_id}/download`);
      
      const downloadResponse = await fetch(url);

      if (!downloadResponse.ok) {
        throw new Error(`HTTP ${downloadResponse.status}: ${downloadResponse.statusText}`);
      }

      // Get filename from response headers
      const contentDisposition = downloadResponse.headers.get('content-disposition');
      let filename = `${batch.base_directory_name}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and trigger download
      const blob = await downloadResponse.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);

    } catch (err) {
      console.error('Download failed:', err);
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingBatches(prev => {
        const updated = new Set(prev);
        updated.delete(batch.batch_id);
        return updated;
      });
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  // Get status badge class
  const getStatusClass = (status) => {
    const statusMap = {
      'queued': 'status-queued',
      'processing': 'status-processing',
      'completed': 'status-completed',
      'failed': 'status-failed',
    };
    return statusMap[status] || 'status-unknown';
  };

  // Calculate overall batch status
  const getBatchStatus = (batch) => {
    if (batch.failed_count > 0) return 'failed';
    if (batch.completed_count === batch.job_count) return 'completed';
    if (batch.completed_count > 0) return 'processing';
    return 'queued';
  };

  // Open batch details modal
  const handleViewBatchDetails = async (batchId) => {
    setSelectedBatchId(batchId);
    setEditingBatchName(false); // Reset edit mode when opening modal
    await loadBatchJobs(batchId);
  };

  // Start editing batch name
  const handleStartEditBatchName = () => {
    const displayName = selectedBatch.custom_name || selectedBatch.base_directory_name;
    setTempBatchName(displayName);
    setEditingBatchName(true);
  };

  // Cancel editing batch name
  const handleCancelEditBatchName = () => {
    setEditingBatchName(false);
    setTempBatchName('');
  };

  // Save custom batch name
  const handleSaveBatchName = async () => {
    if (!tempBatchName.trim()) {
      alert('Batch name cannot be empty');
      return;
    }

    setSavingBatchName(true);
    try {
      await apiClient.patch(`/batches/${selectedBatch.batch_id}/name`, {
        custom_name: tempBatchName.trim(),
      });
      
      // Update local state immediately for responsive UI
      setBatchesData(prev => prev.map(b => 
        b.batch_id === selectedBatch.batch_id 
          ? { ...b, custom_name: tempBatchName.trim(), name_customized: true }
          : b
      ));
      
      setEditingBatchName(false);
      setTempBatchName('');
      
      // Refresh from server to ensure data consistency
      await onRefresh();
    } catch (err) {
      console.error('Error saving batch name:', err);
      alert(`Failed to save batch name: ${err.message}`);
    } finally {
      setSavingBatchName(false);
    }
  };

  // Reset batch name to auto-generated
  const handleResetBatchName = async () => {
    setSavingBatchName(true);
    try {
      await apiClient.patch(`/batches/${selectedBatch.batch_id}/reset-name`);
      
      // Update local state immediately
      setBatchesData(prev => prev.map(b => 
        b.batch_id === selectedBatch.batch_id 
          ? { ...b, custom_name: null, name_customized: false }
          : b
      ));
      
      setEditingBatchName(false);
      setTempBatchName('');
      
      // Refresh from server to ensure data consistency
      await onRefresh();
    } catch (err) {
      console.error('Error resetting batch name:', err);
      alert(`Failed to reset batch name: ${err.message}`);
    } finally {
      setSavingBatchName(false);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return null;
    const kb = bytes / 1024;
    if (kb < 1500) {
      return `${Math.round(kb)} KB`;
    }
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const selectedBatch = selectedBatchId ? batchesData.find(b => b.batch_id === selectedBatchId) : null;

  if (!batchesData || batchesData.length === 0) {
    return (
      <div className="job-list-container">
        <h2>Batch History</h2>
        <p className="empty-message">No batches yet. Submit some images to get started!</p>
      </div>
    );
  }

  return (
    <div className="job-list-container">
      <div className="job-list-header">
        <h2>Batch History</h2>
        <button className="refresh-btn" onClick={onRefresh}>
          ↻ Refresh
        </button>
      </div>

      <div className="jobs-table-wrapper">
        <table className="jobs-table">
          <thead>
            <tr>
              <th>Batch Name</th>
              <th>Files</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {batchesData.map(batch => {
              const batchStatus = getBatchStatus(batch);
              return (
                <tr key={batch.batch_id} className={`job-row ${getStatusClass(batchStatus)}`}>
                  <td className="file-name-cell">
                    <div>
                      <strong>{batch.custom_name || batch.base_directory_name}</strong>
                      {batch.custom_name && (
                        <div style={{ fontSize: '0.75em', color: '#999', fontStyle: 'italic' }}>
                          {batch.base_directory_name}
                        </div>
                      )}
                      {batch.render_description && (
                        <div style={{ fontSize: '0.85em', color: '#666' }}>
                          {batch.render_description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="pipeline-cell">{batch.job_count} files</td>
                  <td className="status-cell">
                    <span className={`status-badge ${getStatusClass(batchStatus)}`}>
                      {batchStatus}
                    </span>
                  </td>
                  <td className="duration-cell">
                    {batch.completed_count}/{batch.job_count} complete
                    {batch.failed_count > 0 && (
                      <span style={{ color: '#dc3545', marginLeft: '8px' }}>
                        ({batch.failed_count} failed)
                      </span>
                    )}
                  </td>
                  <td className="created-cell">
                    {formatDate(batch.batch_created_at)}
                  </td>
                  <td className="actions-cell">
                    {batchStatus === 'completed' && (
                      <button
                        className="download-btn"
                        onClick={() => handleDownloadBatch(batch)}
                        disabled={downloadingBatches.has(batch.batch_id)}
                        title="Download batch outputs"
                      >
                        {downloadingBatches.has(batch.batch_id) ? (
                          <>
                            <span className="spinner-small" />
                            Downloading...
                          </>
                        ) : (
                          <>
                            <span>↓ Download</span>
                            {batch.total_output_size > 0 && (
                              <span className="download-size">
                                {formatFileSize(batch.total_output_size)}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    )}
                    <button
                      className="details-btn"
                      onClick={() => handleViewBatchDetails(batch.batch_id)}
                      title="View batch details"
                    >
                      →
                    </button>
                    <DropdownMenu
                      items={[
                        {
                          label: 'Delete Batch',
                          icon: '🗑',
                          action: 'delete',
                          danger: true,
                        },
                      ]}
                      onSelect={(action) => {
                        if (action === 'delete') {
                          handleDeleteBatch(batch);
                        }
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Batch Details Modal */}
      {selectedBatch && (
        <div className="modal-overlay" onClick={() => setSelectedBatchId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Batch Details</h3>
              <button className="modal-close" onClick={() => setSelectedBatchId(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-group">
                <label>Batch ID</label>
                <value className="monospace">{selectedBatch.batch_id}</value>
              </div>

              <div className="detail-group">
                <label>Batch Name</label>
                {editingBatchName ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={tempBatchName}
                      onChange={(e) => setTempBatchName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSaveBatchName()}
                      maxLength={255}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        border: '1px solid #ced4da',
                        borderRadius: '4px',
                        fontSize: '0.95rem',
                      }}
                      autoFocus
                      disabled={savingBatchName}
                    />
                    <button
                      onClick={handleSaveBatchName}
                      disabled={savingBatchName}
                      style={{
                        padding: '6px 16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: savingBatchName ? 'wait' : 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      {savingBatchName ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEditBatchName}
                      disabled={savingBatchName}
                      style={{
                        padding: '6px 16px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: savingBatchName ? 'wait' : 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <value style={{ flex: 1 }}>
                      {selectedBatch.custom_name || selectedBatch.base_directory_name}
                    </value>
                    <button
                      onClick={handleStartEditBatchName}
                      style={{
                        padding: '4px 12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      ✏️ Edit
                    </button>
                    {selectedBatch.name_customized && (
                      <button
                        onClick={handleResetBatchName}
                        disabled={savingBatchName}
                        style={{
                          padding: '4px 12px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: savingBatchName ? 'wait' : 'pointer',
                          fontSize: '0.85rem',
                        }}
                        title="Reset to auto-generated name"
                      >
                        🔄 Reset
                      </button>
                    )}
                  </div>
                )}
              </div>

              {selectedBatch.custom_name && (
                <div className="detail-group">
                  <label>Original Name</label>
                  <value style={{ color: '#999', fontStyle: 'italic' }}>
                    {selectedBatch.base_directory_name}
                  </value>
                </div>
              )}

              {selectedBatch.render_description && (
                <div className="detail-group">
                  <label>Description</label>
                  <value>{selectedBatch.render_description}</value>
                </div>
              )}

              <div className="detail-group">
                <label>Total Files</label>
                <value>{selectedBatch.job_count}</value>
              </div>

              <div className="detail-group">
                <label>Completed</label>
                <value style={{ color: '#28a745' }}>{selectedBatch.completed_count}</value>
              </div>

              {selectedBatch.failed_count > 0 && (
                <div className="detail-group">
                  <label>Failed</label>
                  <value style={{ color: '#dc3545' }}>{selectedBatch.failed_count}</value>
                </div>
              )}

              <div className="detail-group">
                <label>Created</label>
                <value>{formatDate(selectedBatch.batch_created_at)}</value>
              </div>

              <div className="detail-group">
                <label>Status</label>
                <value className={`status-badge ${getStatusClass(getBatchStatus(selectedBatch))}`}>
                  {getBatchStatus(selectedBatch).toUpperCase()}
                </value>
              </div>

              <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #dee2e6' }} />

              <h4 style={{ marginBottom: '15px' }}>Jobs in this Batch</h4>
              
              {loadingBatchJobs ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <span className="spinner-small" style={{ marginRight: '10px' }} />
                  Loading jobs...
                </div>
              ) : batchJobs.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic' }}>No jobs found in this batch</p>
              ) : (
                <table style={{ width: '100%', fontSize: '0.9em', marginTop: '10px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>File</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                      <th style={{ textAlign: 'right', padding: '8px', width: '60px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchJobs.map(job => (
                      <tr key={job.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '8px' }}>{job.input_filename}</td>
                        <td style={{ padding: '8px' }}>
                          <span className={`status-badge ${getStatusClass(job.status)}`}>
                            {job.status}
                          </span>
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <DropdownMenu
                            items={[
                              {
                                label: 'Delete Job',
                                icon: '🗑',
                                action: 'delete',
                                danger: true,
                              },
                            ]}
                            onSelect={(action) => {
                              if (action === 'delete') {
                                handleDeleteJob(job);
                              }
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-footer">
              {getBatchStatus(selectedBatch) === 'completed' && (
                <button 
                  className="btn btn-primary download-btn-modal"
                  onClick={() => handleDownloadBatch(selectedBatch)}
                  disabled={downloadingBatches.has(selectedBatch.batch_id)}
                >
                  {downloadingBatches.has(selectedBatch.batch_id) ? (
                    <>
                      <span className="spinner-small" style={{ marginRight: '8px' }} />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <span>↓ Download All Files</span>
                      {selectedBatch.total_output_size > 0 && (
                        <span className="download-size" style={{ marginLeft: '8px' }}>
                          ({formatFileSize(selectedBatch.total_output_size)})
                        </span>
                      )}
                    </>
                  )}
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedBatchId(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />
    </div>
  );
};

export default JobList;
