import React, { useState, useEffect } from 'react';
import { getEvents, createEvent } from '../../services/adminService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { DetailsModal } from '../../components/common/DetailsModal';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/helpers';
import { Plus, Eye, RefreshCw, Calendar, MapPin, Clock } from 'lucide-react';

export function AdminEvents() {
  const { addToast } = useToast();

  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeDetails, setActiveDetails] = useState(null);

  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    day: 'DAY_1',
    event_type: 'INDIVIDUAL',
    min_team_size: 1,
    max_team_size: 1,
    venue: '',
    event_date: '',
    start_time: '',
    end_time: '',
    registration_fee: 0,
    status: 'ACTIVE',
  });

  async function load() {
    setIsLoading(true);
    try {
      const data = await getEvents();
      setEvents(data);
    } catch (err) {
      addToast({
        title: 'Events Error',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddEvent(e) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      addToast({ title: 'Validation', message: 'Event code and name are required.', type: 'error' });
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      day: form.day,
      event_type: form.event_type,
      min_team_size: Number(form.min_team_size || 1),
      max_team_size: Number(form.max_team_size || 1),
      venue: form.venue.trim() || null,
      event_date: form.event_date || null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      registration_fee: Number(form.registration_fee || 0),
      status: form.status,
    };

    if (payload.event_type === 'INDIVIDUAL') {
      payload.min_team_size = 1;
      payload.max_team_size = 1;
    } else if (payload.event_type === 'TEAM' && payload.max_team_size < 2) {
      addToast({ title: 'Validation', message: 'Team events must allow at least 2 members.', type: 'error' });
      return;
    }

    try {
      await createEvent(payload);
      addToast({ title: 'Event Created', message: `Event ${payload.code} added successfully.`, type: 'success' });
      setIsAddModalOpen(false);
      setForm({
        code: '',
        name: '',
        description: '',
        day: 'DAY_1',
        event_type: 'INDIVIDUAL',
        min_team_size: 1,
        max_team_size: 1,
        venue: '',
        event_date: '',
        start_time: '',
        end_time: '',
        registration_fee: 0,
        status: 'ACTIVE',
      });
      load();
    } catch (err) {
      addToast({ title: 'Creation Failed', message: err.message, type: 'error' });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '6px' }}>Symposium Events</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Day 1 Technical and Day 2 Non-Technical event catalog and schedules.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={load} disabled={isLoading} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.88rem' }}
          >
            <Plus size={16} /> Add Event
          </button>
        </div>
      </div>

      {/* Events Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Event Name</th>
              <th>Day</th>
              <th>Type</th>
              <th>Team Size</th>
              <th>Fee</th>
              <th>Venue</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Loading events...
                </td>
              </tr>
            ) : events.length ? (
              events.map((evt) => (
                <tr key={evt.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {evt.code}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{evt.name}</div>
                    {evt.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {evt.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={evt.day} />
                  </td>
                  <td>{evt.event_type}</td>
                  <td>
                    {evt.event_type === 'TEAM' ? `${evt.min_team_size} - ${evt.max_team_size}` : '1 (Solo)'}
                  </td>
                  <td style={{ fontWeight: 600, color: '#34d399' }}>
                    {formatCurrency(evt.registration_fee)}
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    {evt.venue || 'TBA'}
                  </td>
                  <td>
                    <StatusBadge status={evt.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setActiveDetails(evt)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                    >
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                  No events registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Event Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Event" maxWidth="720px">
        <form onSubmit={handleAddEvent}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Event Code *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. CS-HACK01"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Event Name *</label>
              <input
                type="text"
                required
                className="form-input"
                placeholder="e.g. Code Crypt Hackathon"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Day *</label>
              <select className="form-select" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
                <option value="DAY_1">DAY_1 (Technical)</option>
                <option value="DAY_2">DAY_2 (Non-Technical)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Type *</label>
              <select
                className="form-select"
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              >
                <option value="INDIVIDUAL">INDIVIDUAL</option>
                <option value="TEAM">TEAM</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status *</label>
              <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
            </div>
          </div>

          {form.event_type === 'TEAM' && (
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Min Team Members</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="form-input"
                  value={form.min_team_size}
                  onChange={(e) => setForm({ ...form, min_team_size: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Max Team Members</label>
                <input
                  type="number"
                  min="2"
                  required
                  className="form-input"
                  value={form.max_team_size}
                  onChange={(e) => setForm({ ...form, max_team_size: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Venue Location</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CSE Lab 3 / Seminar Hall"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Event Date</label>
              <input
                type="date"
                className="form-input"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              />
            </div>
          </div>

          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <input
                type="time"
                className="form-input"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">End Time</label>
              <input
                type="time"
                className="form-input"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Individual Fee (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                value={form.registration_fee}
                onChange={(e) => setForm({ ...form, registration_fee: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Event Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Rules, rounds, and judging criteria..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Event
            </button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <DetailsModal isOpen={Boolean(activeDetails)} onClose={() => setActiveDetails(null)} data={activeDetails} title="Event Details" />
    </div>
  );
}

export default AdminEvents;
