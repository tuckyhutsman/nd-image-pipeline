import React from 'react';

function JobList({ jobs, onRefresh }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Recent Jobs</h2>
        <button className="button" onClick={onRefresh} style={{background: '#6c757d'}}>Refresh</button>
      </div>

      {jobs.length === 0 ? (
        <p>No jobs yet. Submit one to get started!</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th style={{ textAlign: 'left', padding: '10px' }}>Job ID</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>File</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '10px' }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', fontFamily: 'monospace', fontSize: '12px' }}>{job.id.slice(0, 8)}...</td>
                <td style={{ padding: '10px' }}>{job.file_name}</td>
                <td style={{ padding: '10px' }}><span style={{background: '#d4edda', color: '#155724', padding: '4px 8px', borderRadius: '4px', fontSize: '12px'}}>{job.status.toUpperCase()}</span></td>
                <td style={{ padding: '10px', fontSize: '12px', color: '#666' }}>{new Date(job.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default JobList;
