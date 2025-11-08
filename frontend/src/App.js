import React, { useState } from 'react';
import PipelineEditor from './components/PipelineEditor';
import PipelineList from './components/PipelineList';
import JobSubmit from './components/JobSubmit';
import JobList from './components/JobList';
import DarkModeToggle from './components/DarkModeToggle';
import apiClient from './config/api';
import './styles/theme.css';
import './App.css';
import './components/PipelineEditor.css';

function App() {
  const [activeTab, setActiveTab] = useState('submit');
  const [pipelines, setPipelines] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [message, setMessage] = useState('');
  const [pipelineRefreshKey, setPipelineRefreshKey] = useState(0);
  const [editingPipelineId, setEditingPipelineId] = useState(null); // Track which pipeline is being edited

  React.useEffect(() => {
    fetchPipelines();
    fetchJobs();
    const interval = setInterval(fetchJobs, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchPipelines = async () => {
    try {
      const response = await apiClient.get('/pipelines');
      setPipelines(response.data);
    } catch (err) {
      console.error('Error fetching pipelines:', err);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await apiClient.get('/jobs');
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
    // Return to list view after save
    setEditingPipelineId(null);
    // Trigger refresh key to update PipelineEditor without page reload
    setPipelineRefreshKey(prev => prev + 1);
  };

  const handleEditPipeline = (pipelineId) => {
    // If pipelineId is null, we're creating a new pipeline
    setEditingPipelineId(pipelineId === null ? 'new' : pipelineId);
  };

  const handleBackToList = () => {
    setEditingPipelineId(null);
    fetchPipelines();
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>🖼️ Image Processing Pipeline</h1>
              <p>Professional batch image processing for your team</p>
            </div>
            <DarkModeToggle />
          </div>
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
        {activeTab === 'pipelines' && (
          editingPipelineId ? (
            <PipelineEditor 
              key={pipelineRefreshKey} 
              editPipelineId={editingPipelineId}
              onPipelineSaved={handlePipelineSaved}
              onBack={handleBackToList}
            />
          ) : (
            <PipelineList 
              pipelines={pipelines} 
              onRefresh={fetchPipelines}
              onEdit={handleEditPipeline}
            />
          )
        )}
      </div>
    </div>
  );
}

export default App;
