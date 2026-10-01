import React, { useState, useEffect } from 'react';
import {
  getCoordinators,
  createCoordinator,
  assignEventToCoordinator,
  getEvents,
  getAdminSpecialEvents,
} from '../../services/adminService';
import { Modal } from '../../components/common/Modal';
import { DetailsModal } from '../../components/common/DetailsModal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { UserPlus, UserCheck, Plus, Eye, RefreshCw, KeyRound } from 'lucide-react';

export function AdminCoordinators() {
  const { addToast } = useToast();

  const [coordinators, setCoordinators] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [specialEvents, setSpecialEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTargetCoordinator, setAssignTargetCoordinator] = useState(null);
  const [selectedEventValue, setSelectedEventValue] = useState('');
  const [activeDetails, setActiveDetails] = useState(null);

  // New coordinator form
  const [newCoord, setNewCoord] = useState({ name: '', email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const [coords, evts, specials] = await Promise.all([
        getCoordinators(),
        getEvents().catch(() => []),
        getAdminSpecialEvents().catch(() => []),
      ]);
      setCoordinators(coords);
      setAllEvents(evts);
      setSpecialEvents(specials);
    } catch (err) {
      addToast({
        title: 'Loading Error',
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

  async function handleAddCoordinator(e) {
    e.preventDefault();
    if (!newCoord.name.trim() || !newCoord.email.trim() || !newCoord.password) return;

    setIsSubmitting(true);
    try {
      await createCoordinator(newCoord.name, newCoord.email, newCoord.password);
      addToast({
        title: 'Coordinator Created',
        message: `Account created for ${newCoord.name}.`,
        type: 'success',
      });
      setIsAddModalOpen(false);
      setNewCoord({ name: '', email: '', password: '' });
      load();
    } catch (err) {
      addToast({
        title: 'Failed to Create',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAssignEvent(e) {
    e.preventDefault();
    if (!assignTargetCoordinator || !selectedEventValue) return;

    setIsSubmitting(true);
    try {
      await assignEventToCoordinator({
        coordinatorId: assignTargetCoordinator.id,
        assignmentValue: selectedEventValue,
      });
      addToast({
        title: 'Event Assigned',
        message: `Assigned successfully to ${assignTargetCoordinator.name}.`,
        type: 'success',
      });
      setIsAssignModalOpen(false);
      setSelectedEventValue('');
      setAssignTargetCoordinator(null);
      load();
    } catch (err) {
      addToast({
        title: 'Assignment Failed',
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
          <h1 style={{ fontSize: '1.9rem', marginBottom: '6px' }}>Event Coordinators</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage coordinator staff accounts and assign responsibility for specific technical or special events.
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
            <UserPlus size={16} /> Add Coordinator
          </button>
        </div>
      </div>

      {/* Coordinators Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Assigned Events</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Loading coordinators...
                </td>
              </tr>
            ) : coordinators.length ? (
              coordinators.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong style={{ color: 'var(--text-main)' }}>{c.name || 'Coordinator'}</strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.email}</td>
                  <td>
                    <StatusBadge status={c.role} />
                  </td>
                  <td>
                    <StatusBadge status={c.active ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '380px' }}>
                      {c.assigned_events?.length ? (
                        c.assigned_events.map((evt, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: evt.isSpecial ? 'rgba(168, 85, 247, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                              color: evt.isSpecial ? '#c084fc' : '#38bdf8',
                              border: evt.isSpecial
                                ? '1px solid rgba(168, 85, 247, 0.3)'
                                : '1px solid rgba(56, 189, 248, 0.3)',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            {evt.label}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No events assigned</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignTargetCoordinator(c);
                          setIsAssignModalOpen(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        <Plus size={14} /> Assign Event
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDetails(c)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                      >
                        <Eye size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                  No coordinator accounts registered.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Coordinator Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Coordinator Account" maxWidth="500px">
        <form onSubmit={handleAddCoordinator}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. Johnathan Vance"
              value={newCoord.name}
              onChange={(e) => setNewCoord({ ...newCoord, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="coordinator@college.edu"
              value={newCoord.email}
              onChange={(e) => setNewCoord({ ...newCoord, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              required
              minLength={6}
              className="form-input"
              placeholder="Minimum 6 characters"
              value={newCoord.password}
              onChange={(e) => setNewCoord({ ...newCoord, password: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Creating...' : 'Create Coordinator'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Event Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={`Assign Event to ${assignTargetCoordinator?.name || 'Coordinator'}`}
        maxWidth="500px"
      >
        <form onSubmit={handleAssignEvent}>
          <div className="form-group">
            <label className="form-label">Select Event or Special Event *</label>
            <select
              required
              className="form-select"
              value={selectedEventValue}
              onChange={(e) => setSelectedEventValue(e.target.value)}
            >
              <option value="">Select Event...</option>
              <optgroup label="Standard Symposium Events">
                {allEvents.map((evt) => (
                  <option key={evt.id} value={`EVENT:${evt.id}`}>
                    {evt.code} - {evt.name} ({evt.day})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Special Events">
                {specialEvents.map((evt) => (
                  <option key={evt.id} value={`SPECIAL:${evt.id}`}>
                    Special ({evt.code} - {evt.name})
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" onClick={() => setIsAssignModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !selectedEventValue} className="btn btn-primary">
              {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Details Modal */}
      <DetailsModal isOpen={Boolean(activeDetails)} onClose={() => setActiveDetails(null)} data={activeDetails} title="Coordinator Account Details" />
    </div>
  );
}

export default AdminCoordinators;
