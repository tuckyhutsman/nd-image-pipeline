import React, { useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function PipelineList({ pipelines, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [config, setConfig] = useState('{}');

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/pipelines`, {
        name,
        customer_id: 'default',
        config: JSON.parse(config),
      });
      setName('');
      setConfig('{}');
      setShowForm(false);
      onRefresh();
    } catch (err) {
      alert('Error creating pipeline: ' + err.message);
    }
  };

  return (
    <div>
      {showForm && (
        <div className="card">
          <h2>Create New Pipeline</h2>
          <form onSubmit={handleCreate}>
            <div className="input-group">
              <label>Pipeline Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Configuration (JSON)</label>
              <textarea value={config} onChange={(e) => setConfig(e.target.value)} rows="10" style={{fontFamily: 'monospace'}} />
            </div>
            <button type="submit" className="button">Create</button>
            <button type="button" className="button" onClick={() => setShowForm(false)} style={{ marginLeft: '10px', background: '#6c757d' }}>Cancel</button>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Pipelines</h2>
          <button className="button" onClick={() => setShowForm(!showForm)}>{showForm ? 'Hide Form' : 'New Pipeline'}</button>
        </div>

        {pipelines.map((pipeline) => (
          <div key={pipeline.id} style={{ padding: '15px', borderLeft: '4px solid #007bff', marginBottom: '10px', background: '#f9f9f9' }}>
            <h3>{pipeline.name}</h3>
            <p style={{ fontSize: '12px', color: '#666' }}>Customer: {pipeline.customer_id} | Created: {new Date(pipeline.created_at).toLocaleDateString()}</p>
            <pre style={{ fontSize: '12px', overflow: 'auto', background: 'white', padding: '10px', borderRadius: '4px' }}>{JSON.stringify(pipeline.config, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PipelineList;
