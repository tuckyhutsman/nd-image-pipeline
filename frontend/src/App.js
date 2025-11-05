import React, { useState } from 'react';
import axios from 'axios';
import PipelineEditor from './components/PipelineEditor';
import JobSubmit from './components/JobSubmit';
import JobList from './components/JobList';
import './App.css';
import './components/PipelineEditor.css';

const API_URL = process.env.REACT_APP_API_URL || '/api';

function App() {
  const [activeTab, setActiveTab] = useState('submit');
  const [pipelines, setPipelines] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState('');
  const [pipelineRefreshKey, setPipelineRefreshKey] = useState(0);

  React.useEffect(() => {
    fetchPipelines();
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchPipelines = async () => {
    try {
      const response = await axios.get(`${API_URL}/pipelines`);
      setPipelines(response.data);
    } catch (err) {
      console.error('Error fetching pipelines:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_URL}/jobs`);
      setJobs(response.data);
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
  };

  // ISSUE #1 FIX: Handle pipeline save without page reload
  const handlePipelineSaved = () => {
    setMessage('✓ Pipeline saved successfully!');
    setTimeout(() => setMessage(''), 3000);
    fetchPipelines();
    // Trigger refresh key to update PipelineEditor without page reload
    setPipelineRefreshKey(prev => prev + 1);
  };

  const handleJobSubmitted = (jobId) => {
    setMessage(`Job submitted! Processing started...`);
    setTimeout(() => setMessage(''), 5000);
    fetchJobs();
  };

  return (
    <div className="app">
      <div className="header">
        <div className="container">
          <h1>🖼️ Image Processing Pipeline</h1>
          <p>Professional batch image processing for your team</p>
        </div>
      </div>

      <div className="container">
        {message && <div style={{background: '#d4edda', color: '#155724', padding: '15px', borderRadius: '4px', marginBottom: '20px'}}>{message}</div>}

        <div className="tabs">
          <button className={`tab-button ${activeTab === 'submit' ? 'active' : ''}`} onClick={() => setActiveTab('submit')}>Submit Job</button>
          <button className={`tab-button ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>View Jobs</button>
          <button className={`tab-button ${activeTab === 'pipelines' ? 'active' : ''}`} onClick={() => setActiveTab('pipelines')}>Manage Pipelines</button>
        </div>

        {activeTab === 'submit' && <JobSubmit pipelines={pipelines} onJobSubmitted={handleJobSubmitted} />}
        {activeTab === 'jobs' && <JobList jobs={jobs} onRefresh={fetchJobs} />}
        {activeTab === 'pipelines' && <PipelineEditor key={pipelineRefreshKey} onPipelineSaved={handlePipelineSaved} />}
      </div>
    </div>
  );
}

export default App;
