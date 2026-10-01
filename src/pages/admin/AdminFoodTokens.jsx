import React, { useState } from 'react';
import { inspectFoodToken, recordFoodToken, getRegistrationByCode } from '../../services/adminService';
import { QrScannerModal } from '../../components/common/QrScannerModal';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';
import { Utensils, CheckCircle2, AlertTriangle, AlertCircle, Camera, Search } from 'lucide-react';

export function AdminFoodTokens() {
  const { addToast } = useToast();

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [pendingQrToken, setPendingQrToken] = useState(null);
  const [isIssuing, setIsIssuing] = useState(false);

  async function handleInspect(qrToken) {
    if (!qrToken) return;

    try {
      const data = await inspectFoodToken(qrToken);
      if (!data?.success) throw new Error(data?.message || 'Unable to inspect food token QR.');

      setTokenData(data);
      setPendingQrToken(qrToken);
      setInspectModalOpen(true);
      setIsScannerOpen(false);

      if (data.code === 'READY') {
        addToast({
          title: 'Eligible for Meal Token',
          message: `${data.participant_name} is eligible for food token.`,
          type: 'success',
        });
      } else {
        addToast({
          title: 'Token Already Issued',
          message: `${data.participant_name} has already collected their food token.`,
          type: 'warning',
        });
      }
    } catch (err) {
      addToast({
        title: 'Inspection Failed',
        message: err.message,
        type: 'error',
      });
    }
  }

  async function handleManualLookup(e) {
    e.preventDefault();
    if (!manualCode.trim()) return;

    try {
      const reg = await getRegistrationByCode(manualCode.trim());
      if (!reg || !reg.qr_token) throw new Error('Registration ID not found.');
      handleInspect(reg.qr_token);
    } catch (err) {
      addToast({
        title: 'Lookup Error',
        message: err.message || 'Registration not found.',
        type: 'error',
      });
    }
  }

  async function handleIssueToken() {
    if (!pendingQrToken) return;

    setIsIssuing(true);
    try {
      const data = await recordFoodToken(pendingQrToken);
      addToast({
        title: 'Food Token Issued!',
        message: data.message || 'Meal token successfully recorded.',
        type: 'success',
      });
      setTokenData(data);
      setPendingQrToken(null);
    } catch (err) {
      addToast({
        title: 'Issue Failed',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsIssuing(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '860px', margin: '0 auto' }}>
      <div>
        <h1 style={{ fontSize: '1.9rem', marginBottom: '6px' }}>Food Tokens Desk</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Scan delegate QR passes or lookup registration codes to issue and verify meal tokens.
        </p>
      </div>

      <div className="glass-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Meal Counter Scanner</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
              One official food token per verified delegate attendance.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="btn btn-primary"
            style={{ padding: '14px 28px', fontSize: '1.05rem', boxShadow: '0 0 25px var(--accent-cyan-glow)' }}
          >
            <Camera size={22} /> Open Token Scanner
          </button>
        </div>

        {/* Manual lookup */}
        <form onSubmit={handleManualLookup} style={{ borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
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
            <button type="submit" className="btn btn-secondary">
              <Search size={16} /> Inspect
            </button>
          </div>
        </form>
      </div>

      {/* Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={({ qrToken }) => handleInspect(qrToken)}
        title="Scan Participant Pass for Meal Token"
      />

      {/* Inspection Modal */}
      <Modal
        isOpen={inspectModalOpen}
        onClose={() => {
          setInspectModalOpen(false);
          setPendingQrToken(null);
        }}
        title="Food Token Verification"
        maxWidth="540px"
      >
        {tokenData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: tokenData.code === 'READY' ? 'rgba(52, 211, 153, 0.12)' : 'rgba(251, 191, 36, 0.12)',
                border: tokenData.code === 'READY' ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid rgba(251, 191, 36, 0.3)',
                color: tokenData.code === 'READY' ? '#34d399' : '#fbbf24',
              }}
            >
              {tokenData.code === 'READY' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
              <div>
                <strong style={{ fontSize: '1rem', display: 'block' }}>
                  {tokenData.code === 'READY' ? 'TOKEN AVAILABLE' : 'TOKEN ALREADY CLAIMED'}
                </strong>
                <span style={{ fontSize: '0.85rem' }}>{tokenData.message}</span>
              </div>
            </div>

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
                  Participant
                </div>
                <div style={{ fontWeight: 700 }}>{tokenData.participant_name}</div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Registration ID
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {tokenData.registration_code}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  College
                </div>
                <div>{tokenData.college || '—'}</div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Registered Access
                </div>
                <div style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{tokenData.selected_day}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setInspectModalOpen(false);
                  setPendingQrToken(null);
                }}
                className="btn btn-secondary"
              >
                Close
              </button>

              {tokenData.code === 'READY' && (
                <button
                  type="button"
                  onClick={handleIssueToken}
                  disabled={isIssuing}
                  className="btn btn-primary"
                >
                  <Utensils size={18} /> {isIssuing ? 'Issuing...' : 'Issue Meal Token'}
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default AdminFoodTokens;
