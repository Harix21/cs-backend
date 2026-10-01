import React, { useState } from 'react';
import { inspectMainAttendance, recordMainAttendance } from '../../services/adminService';
import { QrScannerModal } from '../../components/common/QrScannerModal';
import { Modal } from '../../components/common/Modal';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { ScanLine, CheckCircle2, AlertTriangle, AlertCircle, Camera, Search, UserCheck } from 'lucide-react';

export function AdminMainAttendance() {
  const { addToast } = useToast();

  const [attendanceDay, setAttendanceDay] = useState('DAY_1');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectData, setInspectData] = useState(null);
  const [pendingToken, setPendingToken] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recentRecorded, setRecentRecorded] = useState(null);

  async function handleInspect({ qrToken, registrationCode }) {
    try {
      const data = await inspectMainAttendance({
        qrToken,
        registrationCode,
        day: attendanceDay,
      });

      if (!data) throw new Error('No response from attendance server.');

      setInspectData(data);
      setPendingToken(qrToken || data.qr_token || null);
      setInspectModalOpen(true);
      setIsScannerOpen(false);

      if (data.code === 'ALREADY_PRESENT') {
        addToast({
          title: 'Already Scanned',
          message: `${data.participant_name || 'Participant'} has already checked in for ${attendanceDay}.`,
          type: 'warning',
        });
      } else if (data.success) {
        addToast({
          title: 'Participant Verified',
          message: `${data.participant_name || 'Participant'} is eligible for check-in.`,
          type: 'success',
        });
      } else {
        addToast({
          title: 'Check-in Rejected',
          message: data.message || 'Invalid QR or day mismatch.',
          type: 'error',
        });
      }
    } catch (err) {
      addToast({
        title: 'Inspection Error',
        message: err.message || 'Could not inspect scan.',
        type: 'error',
      });
    }
  }

  async function handleConfirmAttendance() {
    if (!pendingToken) return;

    setIsRecording(true);
    try {
      const data = await recordMainAttendance({
        qrToken: pendingToken,
        day: attendanceDay,
      });

      if (!data?.success) throw new Error(data?.message || 'Attendance rejected.');

      setRecentRecorded(data);
      setInspectModalOpen(false);
      setPendingToken(null);

      addToast({
        title: 'Attendance Confirmed!',
        message: `Main attendance stamped for ${data.participant_name} (${data.registration_code}).`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Recording Failed',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsRecording(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '860px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '6px' }}>Main Gate Attendance</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Scan participant QR passes or lookup registration codes to check delegates into the symposium.
        </p>
      </div>

      {/* Control Station Card */}
      <div className="glass-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
              Select Active Symposium Gate Day
            </label>
            <div style={{ display: 'flex', gap: '12px' }}>
              {['DAY_1', 'DAY_2'].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setAttendanceDay(day)}
                  className={`btn ${attendanceDay === day ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '10px 24px' }}
                >
                  {day === 'DAY_1' ? 'Day 1 (Technical)' : 'Day 2 (Non-Tech)'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="btn btn-primary"
            style={{ padding: '14px 28px', fontSize: '1.05rem', boxShadow: '0 0 25px var(--accent-cyan-glow)' }}
          >
            <Camera size={22} /> Open QR Scanner
          </button>
        </div>

        {/* Manual Lookup Option */}
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
          <label className="form-label">Manual Registration Lookup</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="form-input"
              style={{ flex: 1 }}
              placeholder="e.g. CS-1042"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                if (manualCode.trim()) {
                  handleInspect({ registrationCode: manualCode.trim() });
                }
              }}
              className="btn btn-secondary"
            >
              <Search size={16} /> Lookup
            </button>
          </div>
        </div>
      </div>

      {/* Recent Scan Receipt */}
      {recentRecorded && (
        <div
          style={{
            padding: '24px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1), rgba(0, 240, 255, 0.05))',
            border: '1px solid rgba(52, 211, 153, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'rgba(52, 211, 153, 0.2)',
                color: '#34d399',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <CheckCircle2 size={26} />
            </div>
            <div>
              <div style={{ color: '#34d399', fontWeight: 800, fontSize: '1.05rem' }}>
                Attendance Recorded: {recentRecorded.participant_name}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                ID: <strong>{recentRecorded.registration_code}</strong> • Day: {recentRecorded.day} • {new Date(recentRecorded.scanned_at).toLocaleTimeString()}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem' }}
          >
            Scan Next Delegate
          </button>
        </div>
      )}

      {/* Live QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleInspect}
        title={`Scan Participant QR - ${attendanceDay}`}
        placeholder="Or type Registration ID..."
      />

      {/* Inspection Result Modal */}
      <Modal
        isOpen={inspectModalOpen}
        onClose={() => {
          setInspectModalOpen(false);
          setPendingToken(null);
        }}
        title="Gate Attendance Verification"
        maxWidth="560px"
      >
        {inspectData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Status Header Banner */}
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background:
                  inspectData.code === 'ALREADY_PRESENT'
                    ? 'rgba(251, 191, 36, 0.12)'
                    : inspectData.success
                    ? 'rgba(52, 211, 153, 0.12)'
                    : 'rgba(248, 113, 113, 0.12)',
                border:
                  inspectData.code === 'ALREADY_PRESENT'
                    ? '1px solid rgba(251, 191, 36, 0.3)'
                    : inspectData.success
                    ? '1px solid rgba(52, 211, 153, 0.3)'
                    : '1px solid rgba(248, 113, 113, 0.3)',
                color:
                  inspectData.code === 'ALREADY_PRESENT'
                    ? '#fbbf24'
                    : inspectData.success
                    ? '#34d399'
                    : '#f87171',
              }}
            >
              {inspectData.code === 'ALREADY_PRESENT' ? (
                <AlertTriangle size={24} />
              ) : inspectData.success ? (
                <CheckCircle2 size={24} />
              ) : (
                <AlertCircle size={24} />
              )}
              <div>
                <strong style={{ fontSize: '1rem', display: 'block' }}>
                  {inspectData.code === 'ALREADY_PRESENT'
                    ? 'ALREADY SCANNED'
                    : inspectData.success
                    ? 'ELIGIBLE FOR CHECK-IN'
                    : 'INVALID SCAN'}
                </strong>
                <span style={{ fontSize: '0.85rem' }}>{inspectData.message}</span>
              </div>
            </div>

            {/* Participant Breakdown */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '14px',
                fontSize: '0.88rem',
              }}
            >
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Name
                </div>
                <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                  {inspectData.participant?.name || inspectData.participant_name}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Registration ID
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {inspectData.registration_code}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  College
                </div>
                <div>{inspectData.participant?.college || '—'}</div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Dept / Year
                </div>
                <div>
                  {inspectData.participant?.department || '—'} / {inspectData.participant?.year || '—'}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Registered Events
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {inspectData.events?.length ? (
                    inspectData.events.map((evt, idx) => (
                      <span key={idx} className="badge badge-info">
                        {evt.code} - {evt.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-dim)' }}>None listed</span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setInspectModalOpen(false);
                  setPendingToken(null);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>

              {inspectData.success && inspectData.code !== 'ALREADY_PRESENT' && (
                <button
                  type="button"
                  onClick={handleConfirmAttendance}
                  disabled={isRecording}
                  className="btn btn-primary"
                >
                  <UserCheck size={18} /> {isRecording ? 'Stamping...' : 'Confirm Gate Entry'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AdminMainAttendance;
