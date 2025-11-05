import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function JobSubmit({ pipelines, onJobSubmitted }) {
  const [pipelineId, setPipelineId] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pipelineId || !file) {
      setError('Please select a pipeline and file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileData = e.target.result.split(',')[1];
        const response = await axios.post(`${API_URL}/jobs`, {
          pipeline_id: parseInt(pipelineId),
          file_name: file.name,
          file_data: fileData,
        });

        onJobSubmitted(response.data.job_id);
        setPipelineId('');
        setFile(null);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.response?.data?.error || 'Error submitting job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Submit Image for Processing</h2>
      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="pipeline">Select Pipeline</label>
          <select id="pipeline" value={pipelineId} onChange={(e) => setPipelineId(e.target.value)}>
            <option value="">-- Choose a pipeline --</option>
            {pipelines.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>

        <div className="input-group">
          <label htmlFor="file">Upload Image (PNG/JPG)</label>
          <input id="file" type="file" accept=".png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        <button type="submit" className="button" disabled={loading}>{loading ? 'Submitting...' : 'Submit Job'}</button>
      </form>
    </div>
  );
}

export default JobSubmit;
