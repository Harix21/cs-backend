import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { getParticipantsForAudience } from '../../services/adminService';
import { openGmailCompose } from '../../utils/helpers';
import { Mail, Send, CheckSquare, Square, Filter } from 'lucide-react';

export function AdminEmails() {
  const { addToast } = useToast();

  const [template, setTemplate] = useState('Registration confirmed');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sendToAll, setSendToAll] = useState(false);

  const [participants, setParticipants] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEmails, setSelectedEmails] = useState(new Set());

  // Template change presets
  useEffect(() => {
    if (template === 'Registration confirmed') {
      setSubject('Cyber Sentinel 2K26 - Registration Verified & Entry Pass');
      setMessage(
        `Dear Participant,\n\nWe are pleased to inform you that your registration and payment for Cyber Sentinel 2K26 have been verified.\n\nYou can access your official entry pass on our checking portal at any time.\n\nPlease arrive on time and bring your QR pass.\n\nWarm regards,\nCyber Sentinel Organizing Committee`
      );
    } else if (template === 'Payment reminder') {
      setSubject('Reminder: Cyber Sentinel 2K26 Registration Verification Pending');
      setMessage(
        `Dear Delegate,\n\nWe noticed your registration for Cyber Sentinel 2K26 is awaiting payment confirmation.\n\nPlease ensure your UTR transaction ID and payment screenshot are properly submitted so our team can issue your verified QR pass.\n\nThank you,\nCyber Sentinel Team`
      );
    } else if (template === 'Event announcement') {
      setSubject('Cyber Sentinel 2K26 - Important Event Updates');
      setMessage(
        `Hello Participants,\n\nPlease review the symposium schedule and guidelines on our official portal. All workshops and technical events will kick off promptly.\n\nSee you at the symposium!\n\nBest,\nCyber Sentinel Operations`
      );
    }
  }, [template]);

  useEffect(() => {
    async function load() {
      try {
        const data = await getParticipantsForAudience();
        setParticipants(data);
      } catch (err) {
        console.error('Error loading audience:', err);
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

  function toggleEmail(email) {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  function handleSend() {
    let targets = [];
    if (sendToAll) {
      targets = participants.map((p) => p.email).filter(Boolean);
    } else {
      targets = [...selectedEmails];
    }

    if (!targets.length) {
      addToast({
        title: 'Recipients Missing',
        message: 'Please choose "Send to all" or check at least one recipient.',
        type: 'error',
      });
      return;
    }

    openGmailCompose({
      bcc: targets,
      subject: subject || template,
      body: message,
    });

    addToast({
      title: 'Gmail Compose Opened',
      message: `BCC list populated with ${targets.length} recipients. Tap Send in Gmail.`,
      type: 'success',
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '860px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '6px' }}>Send Direct Communications</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Select customizable message templates and dispatch emails directly via Gmail with automated audience targeting.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '28px' }}>
        <div className="form-group">
          <label className="form-label">Communication Template</label>
          <select
            className="form-select"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
          >
            <option value="Registration confirmed">Registration confirmed</option>
            <option value="Payment reminder">Payment reminder</option>
            <option value="Event announcement">Event announcement</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Subject</label>
          <input
            type="text"
            className="form-input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email Body Content</label>
          <textarea
            rows={7}
            className="form-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
        </div>

        {/* Audience Controls */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px', marginTop: '20px' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              marginBottom: '16px',
              fontWeight: 700,
              color: 'var(--accent-cyan)',
            }}
          >
            <input
              type="checkbox"
              checked={sendToAll}
              onChange={(e) => setSendToAll(e.target.checked)}
              style={{ transform: 'scale(1.2)', accentColor: 'var(--accent-cyan)' }}
            />
            <span>Broadcast to ALL Registered Participants ({participants.length})</span>
          </label>

          {!sendToAll && (
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(6, 12, 26, 0.5)',
                border: '1px solid var(--border-light)',
              }}
            >
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Filter recipients..."
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
                  <option value="verified">Verified Only</option>
                  <option value="present">Present (Checked-in)</option>
                  <option value="absent">Absent</option>
                </select>
              </div>

              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {filtered.map((p) => {
                  const isChecked = selectedEmails.has(p.email);
                  return (
                    <label
                      key={p.id}
                      onClick={() => toggleEmail(p.email)}
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
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button type="button" onClick={handleSend} className="btn btn-primary" style={{ padding: '12px 24px' }}>
            <Send size={18} /> Open in Gmail
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminEmails;
