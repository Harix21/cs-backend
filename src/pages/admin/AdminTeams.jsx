import React, { useState, useEffect } from 'react';
import { getTeams, createTeam, getEvents } from '../../services/adminService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { DetailsModal } from '../../components/common/DetailsModal';
import { useToast } from '../../context/ToastContext';
import { Users2, Plus, Eye, RefreshCw, ShieldCheck } from 'lucide-react';

export function AdminTeams() {
  const { addToast } = useToast();

  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeDetails, setActiveDetails] = useState(null);

  const [form, setForm] = useState({
    eventId: '',
    teamName: '',
    leaderRegistrationCode: '',
    maxMembers: 2,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const [teamData, evtData] = await Promise.all([
        getTeams(),
        getEvents().catch(() => []),
      ]);
      setTeams(teamData);
      setEvents(evtData);
    } catch (err) {
      addToast({
        title: 'Teams Error',
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

  async function handleAddTeam(e) {
    e.preventDefault();
    if (!form.eventId || !form.teamName.trim()) {
      addToast({ title: 'Validation', message: 'Event and team name are required.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createTeam({
        eventId: form.eventId,
        teamName: form.teamName,
        maxMembers: form.maxMembers,
        leaderRegistrationCode: form.leaderRegistrationCode,
      });

      addToast({
        title: 'Team Created',
        message: `Team "${form.teamName}" added. Code: ${created.team_code}`,
        type: 'success',
      });
      setIsAddModalOpen(false);
      setForm({ eventId: '', teamName: '', leaderRegistrationCode: '', maxMembers: 2 });
      load();
    } catch (err) {
      addToast({
        title: 'Failed to Create Team',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '6px' }}>Event Teams</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Monitor symposium team rosters, assigned leaders, member capacities, and event assignments.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" onClick={load} disabled={isLoading} className="btn btn-secondary">
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.88rem' }}
          >
            <Plus size={16} /> Add Team
          </button>
        </div>
      </div>

      {/* Teams Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Team Code</th>
              <th>Team Name</th>
              <th>Event</th>
              <th>Leader CS ID</th>
              <th>Members</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Loading teams...
                </td>
              </tr>
            ) : teams.length ? (
              teams.map((t) => (
                <tr key={t.id || t.team_code}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {t.team_code}
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text-main)' }}>{t.team_name}</strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{t.event_name || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {t.team_leader_registration_code || '—'}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{t.current_members || 0}</span> / {t.max_members}
                  </td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setActiveDetails(t)}
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
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                  No teams registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Team Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Team" maxWidth="560px">
        <form onSubmit={handleAddTeam}>
          <div className="form-group">
            <label className="form-label">Event *</label>
            <select
              required
              className="form-select"
              value={form.eventId}
              onChange={(e) => setForm({ ...form, eventId: e.target.value })}
            >
              <option value="">Select Event...</option>
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.code} - {evt.name} ({evt.day})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Team Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Sentinels of Code"
              value={form.teamName}
              onChange={(e) => setForm({ ...form, teamName: e.target.value })}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Leader Registration ID (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CS-1042"
                value={form.leaderRegistrationCode}
                onChange={(e) => setForm({ ...form, leaderRegistrationCode: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Max Members *</label>
              <input
                type="number"
                min="2"
                required
                className="form-input"
                value={form.maxMembers}
                onChange={(e) => setForm({ ...form, maxMembers: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Creating Team...' : 'Create Team'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <DetailsModal isOpen={Boolean(activeDetails)} onClose={() => setActiveDetails(null)} data={activeDetails} title="Team Roster & Information" />
    </div>
  );
}

export default AdminTeams;
