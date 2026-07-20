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
          <div className="messages-layout">
            <div className="messages-list">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`message-item ${!msg.is_read ? 'unread' : ''} ${selected?.id === msg.id ? 'active' : ''}`}
                  onClick={() => setSelected(msg)}
                >
                  <h4>{msg.name}</h4>
                  <p>{msg.subject}</p>
                  <span className="msg-date">{new Date(msg.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>

            {selected && (
              <div className="message-detail">
                <h3>{selected.subject}</h3>
                <p className="msg-meta">
                  <User size={14} /> {selected.name}
                  <Mail size={14} /> {selected.email}
                  {selected.phone && <><Phone size={14} /> {selected.phone}</>}
                  <br />
                  {new Date(selected.created_at).toLocaleString()}
                </p>
                <div className="msg-body">{selected.message}</div>
                <div className="msg-actions">
                  <button className="btn btn-secondary" onClick={() => toggleRead(selected)}>
                    {selected.is_read ? <EyeOff size={16} /> : <Eye size={16} />} {selected.is_read ? 'Mark Unread' : 'Mark Read'}
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(selected.id)}>
                    <Trash2 size={16} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
