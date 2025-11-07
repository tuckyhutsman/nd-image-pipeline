import React, { useState } from 'react';
import apiClient from '../config/api';
import DropdownMenu from './DropdownMenu';
import ConfirmDialog from './ConfirmDialog';
import './PipelineList.css';

function PipelineList({ pipelines, onRefresh, onEdit }) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [config, setConfig] = useState('{}');
  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'
  const [confirmDialog, setConfirmDialog] = useState(null);

  // Filter pipelines based on active tab
  const activePipelines = pipelines.filter(p => !p.archived);
  const archivedPipelines = pipelines.filter(p => p.archived);
  const displayedPipelines = activeTab === 'active' ? activePipelines : archivedPipelines;

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/pipelines', {
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

  const handleArchive = async (pipeline) => {
    setConfirmDialog({
      title: 'Archive Pipeline?',
      message: `Are you sure you want to archive "${pipeline.name}"? It will be hidden from the active list but can be restored later.`,
      onConfirm: async () => {
        try {
          await apiClient.patch(`/pipelines/${pipeline.id}/archive`);
          onRefresh();
          setConfirmDialog(null);
        } catch (err) {
          alert('Error archiving pipeline: ' + err.response?.data?.message || err.message);
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const handleUnarchive = async (pipeline) => {
    try {
      await apiClient.patch(`/pipelines/${pipeline.id}/unarchive`);
      onRefresh();
    } catch (err) {
      alert('Error unarchiving pipeline: ' + err.message);
    }
  };

  const handleDelete = async (pipeline) => {
    setConfirmDialog({
      title: 'Delete Pipeline?',
      message: `Are you sure you want to permanently delete "${pipeline.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      confirmStyle: 'danger',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/pipelines/${pipeline.id}`);
          onRefresh();
          setConfirmDialog(null);
        } catch (err) {
          alert('Error deleting pipeline: ' + err.response?.data?.message || err.message);
          setConfirmDialog(null);
        }
      },
      onCancel: () => setConfirmDialog(null),
    });
  };

  const getPipelineMenuItems = (pipeline) => {
    const items = [];

    if (activeTab === 'active') {
      // Active pipeline menu
      items.push({
        label: 'Edit',
        onClick: () => onEdit(pipeline.id),
      });

      items.push({
        label: 'Archive',
        onClick: () => handleArchive(pipeline),
        disabled: pipeline.is_template,
        tooltip: pipeline.is_template ? 'Templates cannot be archived' : undefined,
      });

      items.push({
        label: 'Delete',
        onClick: () => handleDelete(pipeline),
        disabled: pipeline.is_template,
        tooltip: pipeline.is_template ? 'Templates cannot be deleted' : undefined,
        className: 'menu-item-danger',
      });
    } else {
      // Archived pipeline menu
      items.push({
        label: 'Unarchive',
        onClick: () => handleUnarchive(pipeline),
      });

      items.push({
        label: 'Delete',
        onClick: () => handleDelete(pipeline),
        disabled: pipeline.is_template,
        tooltip: pipeline.is_template ? 'Templates cannot be deleted' : undefined,
        className: 'menu-item-danger',
      });
    }

    return items;
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

        {/* Tab Navigation */}
        <div className="pipeline-tabs">
          <button
            className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active ({activePipelines.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveTab('archived')}
          >
            Archived ({archivedPipelines.length})
          </button>
        </div>

        {/* Pipeline List */}
        <div className="pipeline-list">
          {displayedPipelines.length === 0 ? (
            <div className="empty-state">
              <p>No {activeTab} pipelines found.</p>
              {activeTab === 'active' && (
                <button className="button" onClick={() => setShowForm(true)}>Create Your First Pipeline</button>
              )}
            </div>
          ) : (
            displayedPipelines.map((pipeline) => (
              <div key={pipeline.id} className={`pipeline-item ${pipeline.archived ? 'archived' : ''}`}>
                <div className="pipeline-header">
                  <div className="pipeline-title">
                    {pipeline.is_template && <span className="template-badge" title="Protected Template">🔒</span>}
                    <h3>{pipeline.name}</h3>
                    {pipeline.archived && <span className="archived-badge">Archived</span>}
                  </div>
                  <DropdownMenu items={getPipelineMenuItems(pipeline)} />
                </div>
                <p className="pipeline-meta">
                  Created: {new Date(pipeline.created_at).toLocaleDateString()}
                  {pipeline.archived_at && ` | Archived: ${new Date(pipeline.archived_at).toLocaleDateString()}`}
                </p>
                {/* Hide JSON config - cleaner UI */}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          confirmStyle={confirmDialog.confirmStyle}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}
    </div>
  );
}

export default PipelineList;
