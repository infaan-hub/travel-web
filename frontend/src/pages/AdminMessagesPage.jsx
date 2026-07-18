import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { contactAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Mail, Phone, User, CheckCircle, Trash2, Eye, EyeOff } from 'lucide-react';

export default function AdminMessagesPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const res = await contactAPI.getAll();
      setMessages(res.data);
    } catch {
      console.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const toggleRead = async (msg) => {
    try {
      await contactAPI.update(msg.id, { is_read: !msg.is_read });
      loadMessages();
    } catch {
      console.error('Failed to update message');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this message?')) return;
    try {
      await contactAPI.delete(id);
      if (selected?.id === id) setSelected(null);
      loadMessages();
    } catch {
      console.error('Failed to delete message');
    }
  };

  const unread = messages.filter(m => !m.is_read).length;

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1><MessageSquare size={24} /> Messages</h1>
        <p>{unread > 0 ? `${unread} unread messages` : 'All messages read'}</p>
      </div>

      <div className="admin-content">
        {loading ? (
          <p>Loading messages...</p>
        ) : messages.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="messages-list" style={{ flex: 1, maxWidth: selected ? 400 : '100%' }}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`message-item ${!msg.is_read ? 'unread' : ''} ${selected?.id === msg.id ? 'selected' : ''}`}
                  onClick={() => setSelected(msg)}
                  style={{ padding: 12, marginBottom: 8, border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', background: !msg.is_read ? '#f0f7ff' : '#fff' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong>{msg.name}</strong>
                    <small>{new Date(msg.created_at).toLocaleDateString()}</small>
                  </div>
                  <div style={{ color: '#666', fontSize: 13 }}>{msg.subject}</div>
                  {!msg.is_read && <span style={{ background: '#0066cc', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4 }}>New</span>}
                </div>
              ))}
            </div>

            {selected && (
              <div className="message-detail" style={{ flex: 2, border: '1px solid #ddd', borderRadius: 8, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>{selected.subject}</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => toggleRead(selected)} title={selected.is_read ? 'Mark unread' : 'Mark read'}>
                      {selected.is_read ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                    <span><User size={14} /> {selected.name}</span>
                    <span><Mail size={14} /> {selected.email}</span>
                    {selected.phone && <span><Phone size={14} /> {selected.phone}</span>}
                  </div>
                  <small style={{ color: '#999' }}>{new Date(selected.created_at).toLocaleString()}</small>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selected.message}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
