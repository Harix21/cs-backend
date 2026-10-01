import React, { useState, useEffect } from 'react';
import { getAttendanceRecords } from '../../services/adminService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DetailsModal } from '../../components/common/DetailsModal';
import { formatDate } from '../../utils/helpers';
import { Search, Eye, RefreshCw } from 'lucide-react';

export function AdminAttendance() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeDetails, setActiveDetails] = useState(null);

  async function load() {
    setIsLoading(true);
    try {
      const data = await getAttendanceRecords();
      setRecords(data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = records.filter((r) => {
    const regCode = r.registrations?.registration_code || r.registration_id || '';
    const eventName = r.events?.name || r.event_id || '';
    const staff = r.scanned_by_email || '';
    return (
      !search ||
      [regCode, eventName, staff, r.status]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase().trim())
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '6px' }}>Event Attendance Log</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Audit and track all individual event check-in entries stamped by coordinators across the symposium.
          </p>
        </div>
        <button type="button" onClick={load} disabled={isLoading} className="btn btn-secondary">
          <RefreshCw size={16} className={isLoading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="glass-card" style={{ padding: '16px 20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="#00f0ff" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="form-input pl-10"
            style={{ width: '100%', minHeight: '44px' }}
            placeholder="Search registration, event name, scanner email, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Attendance Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Registration ID</th>
              <th>Event</th>
              <th>Scanned Timestamp</th>
              <th>Scanned By</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  Loading attendance records...
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {r.registrations?.registration_code || r.registration_id}
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text-main)' }}>{r.events?.name || r.event_id}</strong>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    {formatDate(r.scanned_at)}
                  </td>
                  <td style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    {r.scanned_by_email || '—'}
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => setActiveDetails(r)}
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
                <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                  No attendance records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <DetailsModal isOpen={Boolean(activeDetails)} onClose={() => setActiveDetails(null)} data={activeDetails} title="Attendance Audit Details" />
    </div>
  );
}

export default AdminAttendance;
