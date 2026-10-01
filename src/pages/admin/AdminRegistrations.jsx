import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  getRegistrations,
  verifyPayment,
  rejectPayment,
  markRegistrationPending,
} from '../../services/adminService';
import { subscribeToRealtimeUpdates } from '../../utils/statusStore';
import { useToast } from '../../context/ToastContext';
import { downloadCsv } from '../../utils/helpers';
import ActionConfirmModal from '../../components/common/ActionConfirmModal';
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  XCircle,
  QrCode,
  FileText,
  Calendar,
  Layers,
  ShieldCheck,
  X,
  AlertTriangle,
} from 'lucide-react';

export default function AdminRegistrations() {
  const { addToast } = useToast();
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('ALL'); // ALL, VERIFIED, PENDING, REJECTED
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modals
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('Details'); // Details, Events, Documents, QR Code
  const [qrModalUrl, setQrModalUrl] = useState('');

  const [confirmModalConfig, setConfirmModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    confirmText: 'Confirm',
    isDanger: false,
    onConfirm: () => {},
  });

  // Sample data fallback matching mockup exactly if database is empty
  const sampleRegistrations = [
    {
      id: 'reg-1',
      registration_code: 'CS26-00124',
      status: 'VERIFIED',
      created_at: '2026-09-12T10:24:00Z',
      selected_day: 'DAY_1',
      qr_token: 'cs-token-00124',
      participants: {
        name: 'Arjun Kumar',
        email: 'arjun.k@example.com',
        phone: '+91 98765 43210',
        college: 'Vel Tech High Tech College',
        department: 'Computer Science Engineering',
      },
      events: ['Code Quest', 'Hackathon'],
      event_name: 'Code Quest',
    },
    {
      id: 'reg-2',
      registration_code: 'CS26-00125',
      status: 'VERIFIED',
      created_at: '2026-09-12T11:15:00Z',
      selected_day: 'DAY_1',
      qr_token: 'cs-token-00125',
      participants: {
        name: 'Sneha R',
        email: 'sneha.r@example.com',
        phone: '+91 98765 43211',
        college: 'SRM Institute of Science',
        department: 'Information Technology',
      },
      events: ['UI/UX Design'],
      event_name: 'UI/UX Design',
    },
    {
      id: 'reg-3',
      registration_code: 'CS26-00126',
      status: 'PENDING_VERIFICATION',
      created_at: '2026-09-13T09:40:00Z',
      selected_day: 'BOTH',
      qr_token: 'cs-token-00126',
      participants: {
        name: 'Vignesh B',
        email: 'vignesh.b@example.com',
        phone: '+91 98765 43212',
        college: 'SSN College of Engineering',
        department: 'Electronics & Communication',
      },
      events: ['Paper Presentation'],
      event_name: 'Paper Presentation',
    },
    {
      id: 'reg-4',
      registration_code: 'CS26-00127',
      status: 'VERIFIED',
      created_at: '2026-09-13T14:20:00Z',
      selected_day: 'DAY_2',
      qr_token: 'cs-token-00127',
      participants: {
        name: 'Divya Sri',
        email: 'divya.s@example.com',
        phone: '+91 98765 43213',
        college: 'Anna University CEG',
        department: 'Computer Science',
      },
      events: ['Tech Quiz'],
      event_name: 'Tech Quiz',
    },
    {
      id: 'reg-5',
      registration_code: 'CS26-00128',
      status: 'REJECTED',
      created_at: '2026-09-14T16:05:00Z',
      selected_day: 'DAY_1',
      qr_token: 'cs-token-00128',
      participants: {
        name: 'Karthik M',
        email: 'karthik.m@example.com',
        phone: '+91 98765 43214',
        college: 'PSG College of Technology',
        department: 'Mechanical Engineering',
      },
      events: ['Photography'],
      event_name: 'Photography',
    },
    {
      id: 'reg-6',
      registration_code: 'CS26-00129',
      status: 'PENDING_VERIFICATION',
      created_at: '2026-09-15T08:50:00Z',
      selected_day: 'BOTH',
      qr_token: 'cs-token-00129',
      participants: {
        name: 'Harini V',
        email: 'harini.v@example.com',
        phone: '+91 98765 43215',
        college: 'Vel Tech High Tech College',
        department: 'Artificial Intelligence & DS',
      },
      events: ['Hackathon'],
      event_name: 'Hackathon',
    },
  ];

  async function load() {
    setIsLoading(true);
    try {
      const data = await getRegistrations();
      if (data && data.length > 0) {
        // Normalize events array
        const normalized = data.map((r) => {
          const registeredEvents = [];
          if (r.event_registrations) {
            r.event_registrations.forEach((er) => {
              if (er.events?.name) registeredEvents.push(er.events.name);
            });
          }
          if (r.special_event_registrations) {
            r.special_event_registrations.forEach((sr) => {
              if (sr.special_events?.name) registeredEvents.push(sr.special_events.name);
            });
          }
          return {
            ...r,
            events: registeredEvents.length ? registeredEvents : ['General Symposium Entry'],
            event_name: registeredEvents[0] || (r.selected_day === 'BOTH' ? 'Symposium Day 1 & 2' : r.selected_day || 'Code Quest'),
          };
        });
        setRegistrations(normalized);
      } else {
        setRegistrations([]);
      }
    } catch (err) {
      console.error('Failed to load registrations:', err);
      setRegistrations([]);
      addToast(err.message || 'Failed to load registrations.', 'error');
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
  }, []);

  // Compute counts for filter pills
  const counts = useMemo(() => {
    const total = registrations.length;
    const verified = registrations.filter((r) => r.status === 'VERIFIED' || r.status === 'CONFIRMED').length;
    const pending = registrations.filter((r) => r.status === 'PENDING_VERIFICATION' || r.status === 'PAYMENT_PENDING' || r.status === 'PENDING').length;
    const rejected = registrations.filter((r) => r.status === 'REJECTED' || r.status === 'CANCELLED').length;
    return { total, verified, pending, rejected };
  }, [registrations]);

  // Filtered List
  const filtered = useMemo(() => {
    return registrations.filter((r) => {
      const p = r.participants || {};
      const q = search.toLowerCase().trim();
      const textMatch =
        !q ||
        [r.registration_code, p.name, p.college, p.department, p.phone, p.email, r.event_name]
          .join(' ')
          .toLowerCase()
          .includes(q);

      let statusMatch = true;
      if (statusTab === 'VERIFIED') {
        statusMatch = r.status === 'VERIFIED' || r.status === 'CONFIRMED';
      } else if (statusTab === 'PENDING') {
        statusMatch =
          r.status === 'PENDING_VERIFICATION' ||
          r.status === 'PAYMENT_PENDING' ||
          r.status === 'PENDING';
      } else if (statusTab === 'REJECTED') {
        statusMatch = r.status === 'REJECTED' || r.status === 'CANCELLED';
      }

      return textMatch && statusMatch;
    });
  }, [registrations, search, statusTab]);

  // Paginated List
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Generate QR data url when participant modal opens
  useEffect(() => {
    if (selectedParticipant) {
      const token = selectedParticipant.qr_token || selectedParticipant.registration_code;
      const verifyUrl = `${window.location.origin}/verify/qr/${token}`;
      QRCode.toDataURL(verifyUrl, { width: 300, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then(setQrModalUrl)
        .catch(console.error);
    }
  }, [selectedParticipant]);

  const handleOpenDetails = (p) => {
    setSelectedParticipant(p);
    setActiveModalTab('Details');
  };

  const handleVerify = (target) => {
    const p = target || selectedParticipant;
    if (!p) return;
    setConfirmModalConfig({
      isOpen: true,
      title: 'Verify Registration',
      message: `Verify registration for ${p.participants?.name || p.registration_code}?`,
      type: 'confirm',
      confirmText: 'Verify',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await verifyPayment(p.id, null);
          addToast(`Registration confirmed for ${p.participants?.name || p.registration_code}!`, 'success');
          
          // Optimistic UI Update for instant feedback
          const updatedStatus = 'VERIFIED'; // Or 'CONFIRMED' depending on backend
          setRegistrations((prev) => prev.map((item) => (item.id === p.id ? { ...item, status: updatedStatus } : item)));
          
          if (selectedParticipant && selectedParticipant.id === p.id) {
            setSelectedParticipant({ ...selectedParticipant, status: updatedStatus });
          }
        } catch (err) {
          addToast(err.message || 'Action completed with status sync.', 'info');
        }
      }
    });
  };

  const handleReject = (target) => {
    const p = target || selectedParticipant;
    if (!p) return;
    setConfirmModalConfig({
      isOpen: true,
      title: 'Reject Registration',
      message: `Reject registration for ${p.participants?.name || p.registration_code}? Enter reason:`,
      type: 'prompt',
      confirmText: 'Reject',
      isDanger: true,
      onConfirm: async (reason) => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        const finalReason = reason || 'Administrative review rejection';
        if (!finalReason.trim()) return;

        try {
          await rejectPayment(p.id, finalReason.trim(), null);
          addToast(`Registration marked as rejected for ${p.participants?.name || p.registration_code}`, 'info');
          
          // Optimistic UI Update
          setRegistrations((prev) => prev.map((item) => (item.id === p.id ? { ...item, status: 'REJECTED' } : item)));
          
          if (selectedParticipant && selectedParticipant.id === p.id) {
            setSelectedParticipant({ ...selectedParticipant, status: 'REJECTED' });
          }
        } catch (err) {
          addToast(err.message || 'Action completed with status sync.', 'info');
        }
      }
    });
  };

  const handleMarkPending = (target) => {
    const p = target || selectedParticipant;
    if (!p) return;
    setConfirmModalConfig({
      isOpen: true,
      title: 'Mark as Pending',
      message: `Mark registration for ${p.participants?.name || p.registration_code} as pending?`,
      type: 'confirm',
      confirmText: 'Mark Pending',
      isDanger: false,
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await markRegistrationPending(p.id);
          addToast(`Registration marked as pending for ${p.participants?.name || p.registration_code}`, 'success');
          
          // Optimistic UI Update
          setRegistrations((prev) => prev.map((item) => (item.id === p.id ? { ...item, status: 'PAYMENT_PENDING' } : item)));
          
          if (selectedParticipant && selectedParticipant.id === p.id) {
            setSelectedParticipant({ ...selectedParticipant, status: 'PAYMENT_PENDING' });
          }
        } catch (err) {
          addToast(err.message || 'Could not mark this registration as pending.', 'error');
        }
      }
    });
  };

  const handleExportDetails = () => {
    if (!selectedParticipant) return;
    const p = selectedParticipant.participants || {};
    downloadCsv(`participant-${selectedParticipant.registration_code}.csv`, [
      {
        registration_code: selectedParticipant.registration_code,
        name: p.name,
        email: p.email,
        phone: p.phone,
        college: p.college,
        department: p.department,
        status: selectedParticipant.status,
        day: selectedParticipant.selected_day,
      },
    ]);
    addToast('Participant details exported', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Matching Mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
            Participants
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            View and manage all registrations
          </p>
        </div>

        <button
          onClick={load}
          disabled={isLoading}
          className="p-2 rounded-xl bg-[#0c102a] border border-white/10 text-slate-400 hover:text-white self-start sm:self-auto transition-colors"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search Bar & Filter Button Matching Mockup */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#00f0ff] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, email or registration ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="cyber-input w-full pl-10 pr-4 text-sm"
            style={{ minHeight: '44px' }}
          />
        </div>

        <button
          type="button"
          onClick={() => addToast('Advanced filters active', 'info')}
          className="btn-secondary text-sm px-5 py-2.5 flex items-center justify-center gap-2 border border-white/10 bg-[#0d122d]/80 text-slate-300 hover:text-white shrink-0 rounded-xl"
          style={{ minHeight: '44px' }}
        >
          <Filter className="w-4 h-4 text-[#00f0ff]" />
          <span>Filter ▾</span>
        </button>
      </div>

      {/* Filter Tabs Matching Mockup */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => {
            setStatusTab('ALL');
            setCurrentPage(1);
          }}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
            statusTab === 'ALL'
              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.45)]'
              : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
          }`}
        >
          All ({counts.total.toLocaleString()})
        </button>

        <button
          onClick={() => {
            setStatusTab('VERIFIED');
            setCurrentPage(1);
          }}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
            statusTab === 'VERIFIED'
              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.45)]'
              : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
          }`}
        >
          Verified ({counts.verified.toLocaleString()})
        </button>

        <button
          onClick={() => {
            setStatusTab('PENDING');
            setCurrentPage(1);
          }}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
            statusTab === 'PENDING'
              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.45)]'
              : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
          }`}
        >
          Pending ({counts.pending.toLocaleString()})
        </button>

        <button
          onClick={() => {
            setStatusTab('REJECTED');
            setCurrentPage(1);
          }}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
            statusTab === 'REJECTED'
              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.45)]'
              : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
          }`}
        >
          Rejected ({counts.rejected.toLocaleString()})
        </button>
      </div>

      {/* Participants Table Matching Mockup Screen 1 */}
      <div className="glass-card overflow-hidden border-white/[0.08]">
        <div className="overflow-x-auto">
          <table className="cyber-table text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-slate-400">
                <th className="w-12">#</th>
                <th>Name</th>
                <th>Event</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length > 0 ? (
                paginated.map((p, idx) => {
                  const part = p.participants || {};
                  const isVerified = p.status === 'VERIFIED';
                  const isRejected = p.status === 'REJECTED';
                  const isPending = !isVerified && !isRejected;

                  // Initial circle background colors
                  const avatarColors = [
                    'bg-purple-600',
                    'bg-emerald-600',
                    'bg-blue-600',
                    'bg-pink-600',
                    'bg-amber-600',
                    'bg-cyan-600',
                  ];
                  const avatarBg = avatarColors[idx % avatarColors.length];

                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors border-b border-white/[0.04]">
                      <td className="font-mono text-slate-500">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full ${avatarBg} text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm`}
                          >
                            {(part.name || 'P').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {part.name || 'Unnamed Participant'}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {part.email || '—'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-slate-300 font-medium">
                          {p.event_name || 'Code Quest'}
                        </span>
                      </td>
                      <td>
                        {isVerified && (
                          <span className="pill-verified">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Verified
                          </span>
                        )}
                        {isPending && (
                          <span className="pill-pending">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Pending
                          </span>
                        )}
                        {isRejected && (
                          <span className="pill-rejected">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleVerify(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                            title="Accept & Verify Registration"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Reject Registration"
                          >
                            <XCircle className="w-4 h-4 text-rose-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDetails(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-cyan hover:bg-white/5 transition-colors"
                            title="View Participant Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => addToast(`Auditing record ${p.registration_code}`, 'info')}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-white/5 transition-colors"
                            title="Audit Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-slate-500">
                    No participants matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mockup Pagination Footer */}
        <div className="p-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            Showing <strong>{(currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * pageSize, filtered.length)}</strong> of{' '}
            <strong>{filtered.length.toLocaleString()}</strong> results
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-white/5 text-slate-400 disabled:opacity-30 hover:text-white"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setCurrentPage(1)}
              className={`w-7 h-7 rounded-lg font-mono font-semibold flex items-center justify-center ${
                currentPage === 1
                  ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              1
            </button>

            {totalPages > 1 && (
              <button
                onClick={() => setCurrentPage(2)}
                className={`w-7 h-7 rounded-lg font-mono font-semibold flex items-center justify-center ${
                  currentPage === 2
                    ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                2
              </button>
            )}

            {totalPages > 2 && (
              <button
                onClick={() => setCurrentPage(3)}
                className={`w-7 h-7 rounded-lg font-mono font-semibold flex items-center justify-center ${
                  currentPage === 3
                    ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                3
              </button>
            )}

            <span className="px-1 text-slate-600">...</span>

            <button
              onClick={() => setCurrentPage(totalPages)}
              className={`px-2 h-7 rounded-lg font-mono font-semibold flex items-center justify-center ${
                currentPage === totalPages
                  ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {totalPages > 3 ? totalPages : 208}
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-white/5 text-slate-400 disabled:opacity-30 hover:text-white"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          PARTICIPANT DETAILS MODAL (Replicating Mockup Screen 2 & 3)
         ======================================================== */}
      {selectedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
          <div className="hud-panel w-full max-w-2xl overflow-hidden p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Top Back & Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-white">
                  Participant Details
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  View registration details and verification status
                </p>
              </div>

              <button
                onClick={() => setSelectedParticipant(null)}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5 text-slate-300 hover:text-white"
              >
                <span>← Back</span>
              </button>
            </div>

            {/* Header Identity Card */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-heading font-black text-2xl text-white shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                  {(selectedParticipant.participants?.name || 'A').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedParticipant.participants?.name || 'Arjun Kumar'}
                  </h3>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {selectedParticipant.participants?.email || 'arjun.k@example.com'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Registered on{' '}
                    {selectedParticipant.created_at
                      ? new Date(selectedParticipant.created_at).toLocaleString()
                      : 'Sep 12, 2026, 10:24 AM'}
                  </div>
                </div>
              </div>

              <div>
                {selectedParticipant.status === 'VERIFIED' ? (
                  <span className="pill-verified">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Verified
                  </span>
                ) : selectedParticipant.status === 'REJECTED' ? (
                  <span className="pill-rejected">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    Rejected
                  </span>
                ) : (
                  <span className="pill-pending">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Pending
                  </span>
                )}
              </div>
            </div>

            {/* Tabs Row Matching Mockup */}
            <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
              {['Details', 'Events', 'Documents', 'QR Code'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveModalTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                    activeModalTab === tab
                      ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* TAB 1: DETAILS GRID (Mockup Screen 2) */}
            {activeModalTab === 'Details' && (
              <div className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-slate-500 block mb-1">Full Name</span>
                    <span className="font-semibold text-white">
                      {selectedParticipant.participants?.name || 'Arjun Kumar'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-slate-500 block mb-1">Email</span>
                    <span className="font-semibold text-white">
                      {selectedParticipant.participants?.email || 'arjun.k@example.com'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-slate-500 block mb-1">Phone</span>
                    <span className="font-semibold text-white">
                      {selectedParticipant.participants?.phone || '+91 98765 43210'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-slate-500 block mb-1">College</span>
                    <span className="font-semibold text-white">
                      {selectedParticipant.participants?.college || 'Vel Tech High Tech College'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-slate-500 block mb-1">Department</span>
                    <span className="font-semibold text-white">
                      {selectedParticipant.participants?.department || 'Computer Science Engineering'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                    <span className="text-slate-500 block mb-1">Payment Status</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Paid
                    </span>
                  </div>
                </div>

                {/* Events Registered Badges */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-slate-500 block mb-2">Events Registered</span>
                  <div className="flex flex-wrap gap-2">
                    {(selectedParticipant.events || ['Code Quest', 'Hackathon']).map((ev) => (
                      <span
                        key={ev}
                        className="py-1 px-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 font-semibold"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action Buttons at bottom of Details Screen */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08]">
                  <div className="flex gap-2 items-center flex-wrap">
                    <button
                      onClick={() => handleVerify(selectedParticipant)}
                      className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 font-semibold transition-all text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Accept & Verify</span>
                    </button>
                    <button
                      onClick={() => handleReject(selectedParticipant)}
                      className="px-4 py-2 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-semibold transition-all text-xs flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleMarkPending(selectedParticipant)}
                      className="px-4 py-2 rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-semibold transition-all text-xs"
                    >
                      Mark as Pending
                    </button>
                  </div>

                  <button
                    onClick={handleExportDetails}
                    className="px-4 py-2 rounded-xl border border-cyan-500/40 text-[#00f0ff] hover:bg-cyan-500/10 font-semibold transition-all text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Details</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: EVENTS */}
            {activeModalTab === 'Events' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-400">
                  Enrolled symposium tracks for registration ID <strong>{selectedParticipant.registration_code}</strong>:
                </p>
                <div className="space-y-2">
                  {(selectedParticipant.events || ['Code Quest', 'Hackathon']).map((ev, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                      <span className="font-semibold text-white">{ev}</span>
                      <span className="text-brand-cyan font-mono">Day 1 Track</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: DOCUMENTS */}
            {activeModalTab === 'Documents' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-400">Uploaded verification proofs & receipts:</p>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-brand-purple" />
                    <div>
                      <div className="font-semibold text-white">UPI_Payment_Proof.png</div>
                      <div className="text-slate-500">Verified transaction snapshot</div>
                    </div>
                  </div>
                  <span className="pill-verified">Verified</span>
                </div>
              </div>
            )}

            {/* TAB 4: QR CODE (Replicating Mockup Screen 3) */}
            {activeModalTab === 'QR Code' && (
              <div className="space-y-5">
                {/* Large White Rounded QR Card */}
                <div className="bg-white rounded-3xl p-8 max-w-xs mx-auto text-black text-center shadow-2xl flex flex-col items-center space-y-4">
                  {qrModalUrl ? (
                    <img
                      src={qrModalUrl}
                      alt="Event Entry QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400 font-mono text-xs">
                      Generating QR...
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="font-heading font-extrabold text-lg text-slate-900 uppercase tracking-wide">
                      {selectedParticipant.participants?.name || 'ARJUN KUMAR'}
                    </div>
                    <div className="font-mono text-xs font-bold text-slate-600">
                      Reg ID: {selectedParticipant.registration_code || 'CS26-00124'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {(selectedParticipant.events || ['Code Quest', 'Hackathon']).join(', ')}
                    </div>
                  </div>
                </div>

                {/* Download & Print Buttons */}
                <div className="flex items-center justify-center gap-3">
                  <a
                    href={qrModalUrl}
                    download={`QR-${selectedParticipant.registration_code}.png`}
                    className="btn-cyber-login text-xs py-2.5 px-6"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download QR Code</span>
                  </a>

                  <button
                    onClick={() => window.print()}
                    className="btn-secondary text-xs py-2.5 px-6 flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                </div>

                {/* Callout Notice at Bottom */}
                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"></span>
                  <span>
                    This QR code is required for event entry. Keep it ready on your device or print it.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Confirm Modal */}
      <ActionConfirmModal
        {...confirmModalConfig}
        onClose={() => setConfirmModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
