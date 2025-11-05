import React, { useState, useEffect } from 'react';
import './JobList.css';

const JobList = ({ jobs, onRefresh }) => {
  const [downloadingJobs, setDownloadingJobs] = useState(new Set());
  const [jobsData, setJobsData] = useState(jobs);
  // ISSUE #3 FIX: Track which job details modal is open
  const [selectedJobId, setSelectedJobId] = useState(null);

  useEffect(() => {
    setJobsData(jobs);
  }, [jobs]);

  // Download job outputs
  const handleDownload = async (jobId) => {
    try {
      setDownloadingJobs(prev => new Set(prev).add(jobId));

      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/jobs/${jobId}/download`;
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = 'image-output';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and trigger download
      const blob = await response.blob();
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
      setDownloadingJobs(prev => {
        const updated = new Set(prev);
        updated.delete(jobId);
        return updated;
      });
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Calculate duration
  const formatDuration = (createdAt, updatedAt) => {
    const start = new Date(createdAt);
    const end = new Date(updatedAt);
    const seconds = Math.round((end - start) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
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

  // ISSUE #3 FIX: Find selected job for modal
  const selectedJob = selectedJobId ? jobsData.find(job => job.id === selectedJobId) : null;

  if (!jobsData || jobsData.length === 0) {
    return (
      <div className="job-list-container">
        <h2>Job History</h2>
        <p className="empty-message">No jobs yet. Submit some images to get started!</p>
      </div>
    );
  }

  return (
    <div className="job-list-container">
      <div className="job-list-header">
        <h2>Job History</h2>
        <button className="refresh-btn" onClick={onRefresh}>
          ↻ Refresh
        </button>
      </div>

      <div className="jobs-table-wrapper">
        <table className="jobs-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Pipeline</th>
              <th>Status</th>
              <th>Created</th>
              <th>Duration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobsData.map(job => (
              <tr key={job.id} className={`job-row ${getStatusClass(job.status)}`}>
                <td className="file-name-cell">
                  <span title={job.file_name}>{job.file_name}</span>
                </td>
                <td className="pipeline-cell">{job.pipeline_id}</td>
                <td className="status-cell">
                  <span className={`status-badge ${getStatusClass(job.status)}`}>
                    {job.status}
                  </span>
                </td>
                <td className="created-cell">
                  {formatDate(job.created_at)}
                </td>
                <td className="duration-cell">
                  {formatDuration(job.created_at, job.updated_at)}
                </td>
                <td className="actions-cell">
                  {job.status === 'completed' && (
                    <button
                      className="download-btn"
                      onClick={() => handleDownload(job.id)}
                      disabled={downloadingJobs.has(job.id)}
                      title="Download processed image(s)"
                    >
                      {downloadingJobs.has(job.id) ? (
                        <>
                          <span className="spinner-small" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          ↓ Download
                        </>
                      )}
                    </button>
                  )}
                  {job.status === 'failed' && (
                    <span className="error-info" title={job.error_message}>
                      Error: {job.error_message?.substring(0, 30)}...
                    </span>
                  )}
                  {/* ISSUE #3 FIX: Details button now shows modal */}
                  <button
                    className="details-btn"
                    onClick={() => setSelectedJobId(job.id)}
                    title="View job details"
                  >
                    →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ISSUE #3 FIX: Job Details Modal */}
      {selectedJob && (
        <div className="modal-overlay" onClick={() => setSelectedJobId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Job Details</h3>
              <button className="modal-close" onClick={() => setSelectedJobId(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-group">
                <label>Job ID</label>
                <value className="monospace">{selectedJob.id}</value>
              </div>

              <div className="detail-group">
                <label>File Name</label>
                <value>{selectedJob.file_name}</value>
              </div>

              <div className="detail-group">
                <label>Pipeline ID</label>
                <value>{selectedJob.pipeline_id}</value>
              </div>

              <div className="detail-group">
                <label>Status</label>
                <value className={`status-badge ${getStatusClass(selectedJob.status)}`}>
                  {selectedJob.status.toUpperCase()}
                </value>
              </div>

              <div className="detail-group">
                <label>Created</label>
                <value>{formatDate(selectedJob.created_at)}</value>
              </div>

              <div className="detail-group">
                <label>Updated</label>
                <value>{formatDate(selectedJob.updated_at)}</value>
              </div>

              <div className="detail-group">
                <label>Duration</label>
                <value>{formatDuration(selectedJob.created_at, selectedJob.updated_at)}</value>
              </div>

              {selectedJob.error_message && (
                <div className="detail-group error">
                  <label>Error</label>
                  <value>{selectedJob.error_message}</value>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedJobId(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobList;
