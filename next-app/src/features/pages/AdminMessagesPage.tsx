"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useState, useEffect } from 'react';
import { contactAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { MessageSquare, Mail, Phone, User, Trash2, Eye, EyeOff } from '@/components/icons';
import { useToast } from "@/components/ToastProvider";

import type {  ContactMessage  } from "@/features/pages/types";
export default function AdminMessagesPage() {
  const toast = useToast();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const res = await contactAPI.getAll();
      setMessages(res.data);
    } catch {
      setError('Messages could not be loaded. Please try again.');
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/login'); return; }
    const timer = window.setTimeout(() => void loadMessages(), 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, isAuthenticated, isAdmin, loadMessages, router]);

  const toggleRead = async (msg: any) => {
    try {
      await contactAPI.update(msg.id, { is_read: !msg.is_read });
      const updated = { ...msg, is_read: !msg.is_read };
      setMessages((current) =>
        current.map((message) => (message.id === msg.id ? updated : message)),
      );
      setSelected(updated);
    } catch {
      toast.error('Failed to update message');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this message?')) return;
    try {
      await contactAPI.delete(id);
      if (selected?.id === id) setSelected(null);
      setMessages((current) => current.filter((message) => message.id !== id));
    } catch {
      toast.error('Failed to delete message');
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
        {error && <div className="alert alert-error" role="alert">{error}</div>}
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
                  <span className="msg-date">{new Date(msg.created_at ?? 0).toLocaleDateString()}</span>
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
                  {new Date(selected.created_at ?? 0).toLocaleString()}
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