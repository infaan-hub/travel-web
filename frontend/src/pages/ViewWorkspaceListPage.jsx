import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workspacesAPI } from '../api/axios';
import { Briefcase, Eye, User, DollarSign, Calendar, ArrowRight, CheckCircle, Clock } from 'lucide-react';

export default function ViewWorkspaceListPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    loadWorkspaces();
  }, [isAuthenticated, isAdmin, navigate]);

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const res = await workspacesAPI.getAll();
      setWorkspaces(res.data?.results || res.data || []);
    } catch {
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <div className="page admin-page">
      <div className="page-header">
        <div className="page-header-row">
          <button className="btn btn-outline" onClick={() => navigate('/admin/dashboard')}>
            <ArrowRight size={16} style={{ transform: 'rotate(180deg)' }} /> Back
          </button>
          <div>
            <h1>All Workspaces</h1>
            <p>{workspaces.length} total workspaces</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading workspaces...</div>
      ) : workspaces.length === 0 ? (
        <div className="empty-state">
          <Briefcase size={48} />
          <h3>No Workspaces Yet</h3>
          <p>Create a workspace from the admin panel to start planning tours.</p>
          <button className="btn btn-primary" onClick={() => navigate('/admin/work-space')}>
            Go to Workspace
          </button>
        </div>
      ) : (
        <div className="workspace-list-grid">
          {workspaces.map(ws => (
            <div key={ws.id} className="workspace-list-card" onClick={() => navigate(`/view-workspace/${ws.id}`)}>
              <div className="workspace-list-top">
                <div className="workspace-list-avatar">
                  <User size={24} />
                </div>
                <div className="workspace-list-info">
                  <h3>{ws.tourist_name || 'Unnamed Tourist'}</h3>
                  <span className="workspace-list-email">{ws.tourist_email || 'No email'}</span>
                </div>
                <span className={`workspace-list-status ${ws.status || 'draft'}`}>
                  {ws.status || 'draft'}
                </span>
              </div>
              <div className="workspace-list-meta">
                <span><DollarSign size={14} /> ${ws.total_price || 0}</span>
                <span><Calendar size={14} /> {new Date(ws.created_at).toLocaleDateString()}</span>
                <span><Briefcase size={14} /> {(ws.selected_tours || []).length} tours</span>
              </div>
              <div className="workspace-list-footer">
                <button className="btn btn-primary btn-sm">
                  <Eye size={14} /> View Workspace
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
