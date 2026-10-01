import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getPayments,
  verifyPayment,
  rejectPayment,
} from '../../services/adminService';
import { subscribeToRealtimeUpdates } from '../../utils/statusStore';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DetailsModal } from '../../components/common/DetailsModal';
import { ImagePreviewModal } from '../../components/common/ImagePreviewModal';
import ActionConfirmModal from '../../components/common/ActionConfirmModal';
import { formatCurrency, openGmailCompose } from '../../utils/helpers';
import {
  Search,
  Check,
  X,
  Send,
  Eye,
  RefreshCw,
  ImageIcon,
  Filter,
} from 'lucide-react';

export function AdminPayments() {
  const { adminProfile } = useAuth();
  const { addToast } = useToast();

  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [activeDetails, setActiveDetails] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    confirmText: 'Confirm',
    isDanger: false,
    onConfirm: () => {},
  });

  async function load() {
    setIsLoading(true);
    try {
      const data = await getPayments(statusFilter);
      setPayments(data);
    } catch (err) {
      addToast({
        title: 'Payments Error',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    const unsubscribe = subscribeToRealtimeUpdates(() => {
      load();
    });
    return () => unsubscribe();
  }, [statusFilter]);

  function handleVerify(registrationId) {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Verify Payment',
      message: 'Verify this payment and activate event access?',
      type: 'confirm',
      confirmText: 'Verify',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await verifyPayment(registrationId, adminProfile?.id || null);
          addToast({
            title: 'Payment Verified',
            message: 'Registration confirmed and verified entry QR pass generated.',
            type: 'success',
          });
          load();
        } catch (err) {
          addToast({
            title: 'Verification Failed',
            message: err.message || 'Action completed with status sync.',
            type: 'error',
          });
        }
      },
    });
  }

  function handleReject(registrationId) {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Reject Payment',
      message: 'Enter reason for payment rejection:',
      type: 'prompt',
      confirmText: 'Reject',
      isDanger: true,
      onConfirm: async (reason) => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        const finalReason = reason || 'Rejected by administrator';
        if (!finalReason.trim()) return;

        try {
          await rejectPayment(registrationId, finalReason.trim(), adminProfile?.id || null);
          addToast({
            title: 'Payment Rejected',
            message: 'Payment flagged as rejected.',
            type: 'info',
          });
          load();
        } catch (err) {
          addToast({
            title: 'Rejection Failed',
            message: err.message || 'Action completed with status sync.',
            type: 'error',
          });
        }
      },
    });
  }

  function handleSendConfirmation(payment) {
    const r = payment.registrations || {};
    const p = r.participants || {};
    const qrPassUrl = `${window.location.origin}/verify/qr/${r.qr_token || ''}`;

    const subject = `Cyber Sentinel registration confirmed - ${r.registration_code}`;
    const body = `Dear ${p.name},

Your payment has been verified and your Cyber Sentinel registration is confirmed.

Registration ID: ${r.registration_code}
Registered Day:  ${r.selected_day}
College:         ${p.college}
Department:      ${p.department || 'Not provided'}
Year:            ${p.year || 'Not provided'}
Amount Paid:     ₹${Number(payment.amount).toFixed(2)}

Official QR Pass: ${qrPassUrl}

Please present this QR pass at the event entry desk.

Regards,
Cyber Sentinel 2K26 Team`;

    openGmailCompose({
      to: p.email,
      subject,
      body,
    });

    addToast({
      title: 'Gmail Compose Opened',
      message: `Draft created for ${p.email}.`,
      type: 'info',
    });
  }

  const filtered = payments.filter((p) => {
    const reg = p.registrations || {};
    const part = reg.participants || {};
    return (
      !search ||
      [
        reg.registration_code,
        part.name,
        part.email,
        part.college,
        p.utr,
        p.status,
        p.event_label,
        p.special_event_label,
      ]
        .join(' ')
        .toLowerCase()
        .includes(search.toLowerCase().trim())
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.9rem', marginBottom: '6px' }}>Payment Verification</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Inspect UPI screenshots, verify UTR numbers, and grant official symposium entry passes.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={isLoading}
          className="btn btn-secondary"
          style={{ fontSize: '0.85rem' }}
        >
          <RefreshCw size={16} className={isLoading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filters Toolbar */}
      <div
        className="glass-card"
        style={{
          padding: '20px 24px',
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={22} color="#00f0ff" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="form-input"
            style={{ width: '100%', paddingLeft: '48px', minHeight: '56px', fontSize: '15px', fontWeight: 600 }}
            placeholder="Search code, participant, email, UTR, event..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select"
          style={{ width: '230px', minHeight: '56px', fontSize: '15px', fontWeight: 600 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Payment Statuses</option>
          <option value="UNDER_REVIEW">UNDER REVIEW</option>
          <option value="VERIFIED">VERIFIED</option>
          <option value="REJECTED">REJECTED</option>
          <option value="FLAGGED">FLAGGED</option>
          <option value="PENDING">PENDING</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ fontSize: '0.92rem', padding: '18px 22px' }}>Registration</th>
              <th style={{ fontSize: '0.92rem', padding: '18px 22px' }}>Participant</th>
              <th style={{ fontSize: '0.92rem', padding: '18px 22px' }}>Amount</th>
              <th style={{ fontSize: '0.92rem', padding: '18px 22px' }}>UTR</th>
              <th style={{ fontSize: '0.92rem', padding: '18px 22px' }}>Proof</th>
              <th style={{ fontSize: '0.92rem', padding: '18px 22px' }}>Status</th>
              <th style={{ fontSize: '0.92rem', padding: '18px 22px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                  Loading payment requests...
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((p) => {
                const reg = p.registrations || {};
                const part = reg.participants || {};

                return (
                  <tr key={p.id || p.registration_id}>
                    <td style={{ padding: '18px 22px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.15rem', color: '#00f0ff' }}>
                        {reg.registration_code || p.registration_id}
                      </div>
                      <div style={{ fontSize: '0.88rem', color: '#94a3b8', marginTop: '2px', fontWeight: 600 }}>
                        {p.special_event_label || p.event_label || reg.selected_day}
                      </div>
                    </td>

                    <td style={{ padding: '18px 22px' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#ffffff' }}>{part.name || 'Participant'}</div>
                      <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '2px' }}>{part.email}</div>
                    </td>

                    <td style={{ padding: '18px 22px', fontWeight: 900, fontSize: '1.25rem', color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(p.amount)}
                    </td>

                    <td style={{ padding: '18px 22px', fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>
                      {p.utr || '—'}
                    </td>

                    <td>
                      {p.screenshot_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(p.screenshot_url)}
                          style={{
                            background: 'transparent',
                            padding: 0,
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-light)',
                            display: 'flex',
                          }}
                          title="Click to view full screenshot proof"
                        >
                          <img
                            src={p.screenshot_url}
                            alt="Payment Proof"
                            style={{ width: '90px', height: '54px', objectFit: 'cover' }}
                          />
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>No proof</span>
                      )}
                    </td>

                    <td>
                      <StatusBadge status={p.status} />
                    </td>

                    <td style={{ padding: '18px 22px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => setActiveDetails(p)}
                          className="btn btn-secondary"
                          style={{ padding: '9px 13px', fontSize: '0.92rem' }}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>

                        {p.status !== 'VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => handleVerify(p.registration_id)}
                            className="btn btn-primary"
                            style={{ padding: '9px 14px', fontSize: '0.92rem', fontWeight: 700 }}
                            title="Verify Payment"
                          >
                            <Check size={16} /> Verify
                          </button>
                        )}

                        {p.status !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => handleReject(p.registration_id)}
                            className="btn btn-danger"
                            style={{ padding: '9px 14px', fontSize: '0.92rem', fontWeight: 700 }}
                            title="Reject Payment"
                          >
                            <X size={16} /> Reject
                          </button>
                        )}

                        {p.status === 'VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => handleSendConfirmation(p)}
                            className="btn btn-secondary"
                            style={{ padding: '9px 14px', fontSize: '0.92rem', fontWeight: 700, color: '#38bdf8' }}
                            title="Send Gmail Confirmation"
                          >
                            <Send size={16} /> Email
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                  No payment requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      <DetailsModal
        isOpen={Boolean(activeDetails)}
        onClose={() => setActiveDetails(null)}
        title="Payment & Registration Breakdown"
        data={activeDetails}
      />

      {/* Image Preview Lightbox */}
      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage}
      />

      {/* Action Confirm Modal */}
      <ActionConfirmModal
        {...confirmModalConfig}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}

export default AdminPayments;
