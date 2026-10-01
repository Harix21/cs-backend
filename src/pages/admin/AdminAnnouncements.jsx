import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getParticipantsForAudience, saveAnnouncement } from '../../services/adminService';
import { openGmailCompose } from '../../utils/helpers';
import { Bell, Send, CheckSquare, Square, Search, Filter } from 'lucide-react';

export function AdminAnnouncements() {
  const { adminProfile, adminSession } = useAuth();
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetMode, setTargetMode] = useState('all'); // 'all' or 'selected'

  const [participants, setParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const data = await getParticipantsForAudience();
        setParticipants(data);
      } catch (err) {
        console.error('Error loading audience:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const filtered = participants.filter((p) => {
    const textMatch =
      !search ||
      [p.name, p.email, p.registration_code, p.college]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase().trim());

    if (!textMatch) return false;
    if (statusFilter === 'verified') return p.isVerified;
    if (statusFilter === 'present') return p.isPresent;
    if (statusFilter === 'absent') return p.isAbsent;
    return true;
  });

  function toggleParticipant(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAllFiltered() {
    const next = new Set(selectedIds);
    filtered.forEach((p) => next.add(p.id));
    setSelectedIds(next);
  }

  function handleDeselectAllFiltered() {
    const next = new Set(selectedIds);
    filtered.forEach((p) => next.delete(p.id));
    setSelectedIds(next);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      addToast({ title: 'Validation', message: 'Title and message are required.', type: 'error' });
      return;
    }

    let bccEmails = [];
    if (targetMode === 'all') {
      bccEmails = participants.map((p) => p.email).filter(Boolean);
    } else {
      bccEmails = participants
        .filter((p) => selectedIds.has(p.id))
        .map((p) => p.email)
        .filter(Boolean);
    }

    if (!bccEmails.length) {
      addToast({ title: 'No Recipients', message: 'No recipients selected.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      await saveAnnouncement({
        title,
        message,
        targetScope: 'ALL',
        createdBy: adminSession?.user?.id || adminProfile.id,
      });

      openGmailCompose({
        bcc: bccEmails,
        subject: title,
        body: message,
      });

      addToast({
        title: 'Announcement Saved',
        message: `Saved to database and Gmail compose opened with ${bccEmails.length} recipients.`,
        type: 'success',
      });
    } catch (err) {
      addToast({ title: 'Announcement Error', message: err.message, type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '860px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '6px' }}>Broadcast Announcements</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Save official symposium announcements to database records and open Gmail with ready recipients.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '28px' }}>
        <div className="form-group">
          <label className="form-label">Announcement Title *</label>
          <input
            type="text"
            required
            className="form-input"
            placeholder="e.g. Schedule Update: Day 1 Keynote starts at 9:30 AM"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Announcement Message *</label>
          <textarea
            required
            rows={6}
            className="form-textarea"
            placeholder="Write your announcement details here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
        </div>

        <div className="form-group">
          <label className="form-label">Audience Scope</label>
          <select
            className="form-select"
            value={targetMode}
            onChange={(e) => setTargetMode(e.target.value)}
          >
            <option value="all">All Registered Participants ({participants.length})</option>
            <option value="selected">Custom Filtered Selection ({selectedIds.size} selected)</option>
          </select>
        </div>

        {/* Recipient Picker if 'selected' */}
        {targetMode === 'selected' && (
          <div
            style={{
              marginTop: '16px',
              padding: '18px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(6, 12, 26, 0.5)',
              border: '1px solid var(--border-light)',
            }}
          >
            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                style={{ flex: 1, minWidth: '200px' }}
                placeholder="Search recipient..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="form-select"
                style={{ width: '150px' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="verified">Only Verified</option>
                <option value="present">Present (Checked-in)</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              >
                Select Filtered ({filtered.length})
              </button>
              <button
                type="button"
                onClick={handleDeselectAllFiltered}
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              >
                Deselect Filtered
              </button>
            </div>

            <div
              style={{
                maxHeight: '220px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {filtered.map((p) => {
                const isChecked = selectedIds.has(p.id);
                return (
                  <label
                    key={p.id}
                    onClick={() => toggleParticipant(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: isChecked ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      style={{ accentColor: 'var(--accent-cyan)' }}
                    />
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: 'var(--text-dim)' }}>• {p.email}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{ padding: '12px 24px' }}
          >
            <Send size={18} /> {isSubmitting ? 'Processing...' : 'Save & Open Gmail'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AdminAnnouncements;
