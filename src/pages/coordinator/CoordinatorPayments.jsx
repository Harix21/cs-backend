import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getCoordinatorAssignedEvents,
  getCoordinatorPayments,
  verifyCoordinatorPayment,
  rejectCoordinatorPayment,
  updateCoordinatorParticipantStatus,
} from '../../services/coordinatorService';
import { subscribeToRealtimeUpdates } from '../../utils/statusStore';
import StatusBadge from '../../components/ui/StatusBadge';
import ImagePreviewModal from '../../components/common/ImagePreviewModal';
import Modal from '../../components/common/Modal';
import DetailsModal from '../../components/common/DetailsModal';
import ActionConfirmModal from '../../components/common/ActionConfirmModal';
import { formatCurrency, formatDate, openGmailCompose } from '../../utils/helpers';
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Mail,
  ExternalLink,
  Layers,
  Image,
} from 'lucide-react';

export default function CoordinatorPayments() {
  const { user, getCoordinatorClientInstance } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState([]);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [assignedSpecialEvents, setAssignedSpecialEvents] = useState([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [eventFilter, setEventFilter] = useState('ALL');

  // Modals
  const [previewImage, setPreviewImage] = useState(null);
  const [rejectingPayment, setRejectingPayment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedDetails, setSelectedDetails] = useState(null);

  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    confirmText: 'Confirm',
    isDanger: false,
    onConfirm: () => {},
  });

  const client = getCoordinatorClientInstance();

  const loadData = async () => {
    try {
      setRefreshing(true);
      const coordId = user?.id || null;
      let normalEvents = [];
      let specialEvents = [];

      if (coordId) {
        try {
          const eventsData = await getCoordinatorAssignedEvents(client, coordId);
          normalEvents = eventsData.normalEvents || [];
          specialEvents = eventsData.specialEvents || [];
        } catch (evErr) {
          console.warn('Coordinator payments events error:', evErr);
        }
      }

      setAssignedEvents(normalEvents);
      setAssignedSpecialEvents(specialEvents);

      const list = await getCoordinatorPayments(client, normalEvents, specialEvents).catch(() => []);
      setPayments(list || []);
    } catch (err) {
      console.warn('Coordinator payments error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToRealtimeUpdates(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  const handleVerify = (payment) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Verify Payment',
      message: `Verify payment of ${formatCurrency(payment.amount)} for ${payment.registrations?.registration_code}?`,
      type: 'confirm',
      confirmText: 'Verify',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(true);
          await verifyCoordinatorPayment(client, payment.registration_id, user?.id || null);
          addToast('Payment verified successfully!', 'success');
          loadData();
        } catch (err) {
          console.error(err);
          addToast(err.message || 'Payment verified with real-time update.', 'info');
          loadData();
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleMarkPending = (payment) => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Mark as Pending',
      message: `Mark payment of ${formatCurrency(payment.amount)} for ${payment.registrations?.registration_code} as Pending?`,
      type: 'confirm',
      confirmText: 'Mark Pending',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(true);
          await updateCoordinatorParticipantStatus(client, payment.registration_id, 'PENDING', user?.id || null);
          addToast('Payment marked as Pending', 'info');
          loadData();
        } catch (err) {
          console.error(err);
          addToast(err.message || 'Status updated with real-time sync.', 'info');
          loadData();
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      addToast('Please enter a rejection reason', 'error');
      return;
    }

    try {
      setActionLoading(true);
      await rejectCoordinatorPayment(client, rejectingPayment.registration_id, rejectionReason, user?.id || null);
      addToast('Payment rejected successfully', 'success');
      setRejectingPayment(null);
      setRejectionReason('');
      loadData();
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Payment rejected with real-time update.', 'info');
      setRejectingPayment(null);
      setRejectionReason('');
      loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendConfirmation = (payment) => {
    const reg = payment.registrations || {};
    const part = reg.participants || {};
    const email = part.email;
    const name = part.name || 'Participant';
    const code = reg.registration_code || '';
    const verifyLink = `${window.location.origin}/verify/qr/${reg.qr_token || ''}`;

    if (!email) {
      addToast('Participant email not available', 'error');
      return;
    }

    const subject = `CyberSentinel 2K26 - Payment Verified (${code})`;
    const body = `Dear ${name},\n\nWe have successfully verified your payment of ${formatCurrency(payment.amount)} (UTR: ${payment.utr || 'N/A'}).\n\nYour Registration ID is: ${code}\nSelected Day: ${reg.selected_day || 'N/A'}\n\nYou can access and view your official digital badge pass here:\n${verifyLink}\n\nWe look forward to seeing you at CyberSentinel 2K26!\n\nBest regards,\nCyberSentinel 2K26 Organizing Team`;

    openGmailCompose(email, subject, body);
  };

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const q = search.trim().toLowerCase();
      const utr = (p.utr || '').toLowerCase();
      const code = (p.registrations?.registration_code || '').toLowerCase();
      const name = (p.registrations?.participants?.name || '').toLowerCase();
      const email = (p.registrations?.participants?.email || '').toLowerCase();

      const matchesSearch = !q || utr.includes(q) || code.includes(q) || name.includes(q) || email.includes(q);
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

      let matchesEvent = true;
      if (eventFilter !== 'ALL') {
        if (eventFilter.startsWith('SPECIAL:')) {
          const specId = eventFilter.replace('SPECIAL:', '');
          const hasSpec = (p.registrations?.special_event_registrations || []).some(
            (s) => s.special_events?.id === specId
          );
          matchesEvent = hasSpec;
        } else {
          const normalMatch = assignedEvents.find((e) => e.id === eventFilter);
          if (normalMatch) {
            const day = p.registrations?.selected_day;
            matchesEvent = day === 'BOTH' || day === normalMatch.day;
          }
        }
      }

      return matchesSearch && matchesStatus && matchesEvent;
    });
  }, [payments, search, statusFilter, eventFilter, assignedEvents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-cyan" />
            Assigned Payments
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review UPI payments and verify transactions for participants in your events.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={refreshing}
          className="btn-secondary self-start sm:self-auto flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters Toolbar with Enlarged, Prominent Input Boxes */}
      <div className="glass-card p-6 space-y-4 shadow-xl border border-violet-500/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Search */}
          <div className="relative">
            <Search className="w-6 h-6 text-[#00f0ff] absolute left-4.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by CS-ID, UTR, name, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="cyber-input pl-14 font-semibold w-full shadow-md"
              style={{ minHeight: '58px' }}
            />
          </div>

          {/* Status */}
          <div className="relative">
            <Filter className="w-6 h-6 text-[#00f0ff] absolute left-4.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="cyber-input pl-14 font-semibold w-full shadow-md cursor-pointer"
              style={{ minHeight: '58px' }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="VERIFIED">Verified</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Event Filter */}
          <div className="relative">
            <Layers className="w-6 h-6 text-[#00f0ff] absolute left-4.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="cyber-input pl-14 font-semibold w-full shadow-md cursor-pointer"
              style={{ minHeight: '58px' }}
            >
              <option value="ALL">All Assigned Events</option>
              {assignedEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.code} - {ev.name} ({ev.day})
                </option>
              ))}
              {assignedSpecialEvents.map((sp) => (
                <option key={sp.id} value={`SPECIAL:${sp.id}`}>
                  [Special] {sp.code} - {sp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-base font-bold text-slate-200 pt-1 px-1">
          <span>Showing {filtered.length} of {payments.length} assigned payments</span>
          {(search || statusFilter !== 'ALL' || eventFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
                setEventFilter('ALL');
              }}
              className="text-[#00f0ff] hover:underline font-extrabold text-base"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Payments Table with Bold, High-Legibility Data Rows */}
      <div className="glass-card overflow-hidden shadow-2xl border border-violet-500/30">
        {loading ? (
          <div className="p-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-cyan" />
            <span className="text-lg font-bold">Loading payments...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50 text-brand-cyan" />
            <p className="text-lg font-semibold">No payments found matching the criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th className="py-5 px-6 text-sm sm:text-base font-black text-slate-100 tracking-wider uppercase">CS ID</th>
                  <th className="py-5 px-6 text-sm sm:text-base font-black text-slate-100 tracking-wider uppercase">Participant</th>
                  <th className="py-5 px-6 text-sm sm:text-base font-black text-slate-100 tracking-wider uppercase">Amount</th>
                  <th className="py-5 px-6 text-sm sm:text-base font-black text-slate-100 tracking-wider uppercase">UTR / Ref</th>
                  <th className="py-5 px-6 text-sm sm:text-base font-black text-slate-100 tracking-wider uppercase">Screenshot</th>
                  <th className="py-5 px-6 text-sm sm:text-base font-black text-slate-100 tracking-wider uppercase">Status</th>
                  <th className="py-5 px-6 text-sm sm:text-base font-black text-slate-100 tracking-wider uppercase">Submitted</th>
                  <th className="py-5 px-6 text-sm sm:text-base font-black text-slate-100 tracking-wider uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((payment) => {
                  const reg = payment.registrations || {};
                  const part = reg.participants || {};
                  return (
                    <tr key={`${payment.registration_id}-${payment.submitted_at}`} className="hover:bg-white/[0.05] transition-colors">
                      <td className="py-5 px-6 font-mono font-black text-lg sm:text-xl text-[#00f0ff] whitespace-nowrap">
                        {reg.registration_code || '—'}
                      </td>
                      <td className="py-5 px-6">
                        <div className="font-black text-lg sm:text-xl text-white tracking-wide">{part.name || 'Unnamed'}</div>
                        <div className="text-sm sm:text-base font-semibold text-slate-300 mt-1">{part.email || '—'}</div>
                      </td>
                      <td className="py-5 px-6 font-mono font-black text-xl sm:text-2xl text-emerald-400 whitespace-nowrap">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="py-5 px-6 font-mono font-extrabold text-base sm:text-lg text-slate-100 select-all">
                        {payment.utr || '—'}
                      </td>
                      <td className="py-5 px-6">
                        {payment.screenshot_url ? (
                          <button
                            onClick={() =>
                              setPreviewImage({
                                url: payment.screenshot_url,
                                title: `Receipt: ${reg.registration_code || ''} (UTR: ${payment.utr || 'N/A'})`,
                              })
                            }
                            className="inline-flex items-center gap-2.5 text-base font-extrabold text-[#00f0ff] py-2 px-4 rounded-xl border border-cyan-500/50 bg-cyan-950/60 hover:bg-cyan-500/30 transition-all shadow-md"
                          >
                            <Image className="w-5 h-5" />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-base font-semibold text-slate-500">None</span>
                        )}
                      </td>
                      <td className="py-5 px-6">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="py-5 px-6 text-base font-mono font-bold text-slate-200 whitespace-nowrap">
                        {formatDate(payment.submitted_at)}
                      </td>
                      <td className="py-5 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => setSelectedDetails(payment)}
                            className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-brand-cyan/60 text-slate-300 hover:text-white transition-colors"
                            title="Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>

                          {payment.status !== 'VERIFIED' && (
                            <button
                              onClick={() => handleVerify(payment)}
                              disabled={actionLoading}
                              className="btn-primary text-base font-extrabold py-2 px-4 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
                              title="Verify Payment"
                            >
                              <CheckCircle className="w-5 h-5" />
                              <span>Verify</span>
                            </button>
                          )}

                          {payment.status !== 'PENDING_VERIFICATION' && payment.status !== 'PENDING' && (
                            <button
                              onClick={() => handleMarkPending(payment)}
                              disabled={actionLoading}
                              className="btn-secondary text-base font-extrabold py-2 px-4 flex items-center gap-2 text-amber-300 border-amber-500/40 hover:bg-amber-500/20 shadow-lg"
                              title="Mark as Pending"
                            >
                              <Clock className="w-5 h-5" />
                              <span>Pending</span>
                            </button>
                          )}

                          {payment.status !== 'REJECTED' && (
                            <button
                              onClick={() => {
                                setRejectingPayment(payment);
                                setRejectionReason('');
                              }}
                              disabled={actionLoading}
                              className="btn-secondary text-base font-extrabold py-2 px-4 flex items-center gap-2 text-rose-300 border-rose-500/40 hover:bg-rose-500/20 shadow-lg"
                              title="Reject Payment"
                            >
                              <XCircle className="w-5 h-5" />
                              <span>Reject</span>
                            </button>
                          )}

                          {payment.status === 'VERIFIED' && (
                            <button
                              onClick={() => handleSendConfirmation(payment)}
                              className="btn-secondary text-base font-extrabold py-2 px-4 flex items-center gap-2 text-[#00f0ff] border-cyan-500/50 hover:bg-cyan-500/20 rounded-xl shadow-md"
                              title="Send Confirmation Email"
                            >
                              <Mail className="w-5 h-5" />
                              <span>Email</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screenshot Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={previewImage.title}
        />
      )}

      {/* Rejection Modal */}
      {rejectingPayment && (
        <Modal
          isOpen={!!rejectingPayment}
          onClose={() => setRejectingPayment(null)}
          title={`Reject Payment: ${rejectingPayment.registrations?.registration_code || ''}`}
        >
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <p className="text-sm text-slate-300">
              Please specify the reason for rejecting this payment (e.g. invalid UTR, incorrect amount, illegible screenshot).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Rejection Reason *
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. UTR number does not match banking statement."
                className="cyber-input w-full text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setRejectingPayment(null)}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="btn-primary text-sm bg-rose-600 hover:bg-rose-500 text-white"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Details Modal */}
      {selectedDetails && (
        <DetailsModal
          isOpen={!!selectedDetails}
          onClose={() => setSelectedDetails(null)}
          title={`Payment: ${selectedDetails.registrations?.registration_code || ''}`}
          data={{
            registration_code: selectedDetails.registrations?.registration_code,
            participant_name: selectedDetails.registrations?.participants?.name,
            participant_email: selectedDetails.registrations?.participants?.email,
            college: selectedDetails.registrations?.participants?.college,
            amount: formatCurrency(selectedDetails.amount),
            utr: selectedDetails.utr,
            status: selectedDetails.status,
            submitted_at: selectedDetails.submitted_at,
            day: selectedDetails.registrations?.selected_day,
          }}
        />
      )}

      {/* Action Confirm Modal */}
      <ActionConfirmModal
        {...confirmModalConfig}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
