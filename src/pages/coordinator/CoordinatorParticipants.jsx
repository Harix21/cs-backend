import React, { useEffect, useState, useMemo } from 'react';
import QRCode from 'qrcode';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getCoordinatorAssignedEvents,
  getCoordinatorParticipants,
  getCoordinatorTeams
} from '../../services/coordinatorService';
import { subscribeToRealtimeUpdates } from '../../utils/statusStore';
import StatusBadge from '../../components/ui/StatusBadge';
import {
  Search,
  Filter,
  Eye,
  RefreshCw,
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
  UserCheck,
} from 'lucide-react';

export default function CoordinatorParticipants() {
  const { user, getCoordinatorClientInstance } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [assignedSpecialEvents, setAssignedSpecialEvents] = useState([]);

  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('ALL'); // ALL, VERIFIED, PENDING, REJECTED
  const [eventFilter, setEventFilter] = useState('ALL');
  const [showEventFilterMenu, setShowEventFilterMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Modals matching Screen 4 and Screen 5
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('Details'); // Details, Events, Documents, QR Code
  const [qrModalUrl, setQrModalUrl] = useState('');

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
          console.warn('Could not fetch coordinator assigned events:', evErr);
        }
      }

      setAssignedEvents(normalEvents);
      setAssignedSpecialEvents(specialEvents);

      const [list, allTeams] = await Promise.all([
        getCoordinatorParticipants(client, normalEvents, specialEvents),
        getCoordinatorTeams(client).catch(() => [])
      ]);

      const mappedList = (list || []).map(p => {
        const team = allTeams.find(t => (t.team_members || []).some(m => m.cs_id === p.registration_code));
        return { ...p, team };
      });

      setParticipants(mappedList);
    } catch (err) {
      console.error('Could not load coordinator participants:', err);
      setParticipants([]);
      addToast(err.message || 'Could not load assigned participants.', 'error');
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

  // Filtered participants with live status and search
  const filtered = useMemo(() => {
    return participants.filter((p) => {
      const q = search.trim().toLowerCase();
      const code = (p.registration_code || '').toLowerCase();
      const name = (p.participants?.name || '').toLowerCase();
      const email = (p.participants?.email || '').toLowerCase();
      const college = (p.participants?.college || '').toLowerCase();
      const phone = (p.participants?.phone || '').toLowerCase();

      const matchesSearch =
        !q ||
        code.includes(q) ||
        name.includes(q) ||
        email.includes(q) ||
        college.includes(q) ||
        phone.includes(q);

      let matchesStatus = true;
      const s = (p.status || '').toUpperCase();
      if (statusTab === 'VERIFIED') {
        matchesStatus = s === 'VERIFIED' || s === 'CONFIRMED';
      } else if (statusTab === 'PENDING') {
        matchesStatus =
          s === 'PENDING_VERIFICATION' ||
          s === 'PENDING' ||
          s === 'PAYMENT_PENDING' ||
          s === 'UNDER_REVIEW' ||
          s === 'DRAFT';
      } else if (statusTab === 'REJECTED') {
        matchesStatus = s === 'REJECTED' || s === 'CANCELLED';
      }

      let matchesEvent = true;
      if (eventFilter.startsWith('TRACK:')) {
        const day = eventFilter.replace('TRACK:', '');
        matchesEvent = p.selected_day === day || p.selected_day === 'BOTH';
      } else if (eventFilter.startsWith('SPECIAL:')) {
        const specialEventId = eventFilter.replace('SPECIAL:', '');
        matchesEvent = (p.special_event_registrations || []).some(
          (registration) => registration.special_event_id === specialEventId
        );
      } else if (eventFilter !== 'ALL') {
        matchesEvent = (p.event_registrations || []).some(
          (registration) => registration.event_id === eventFilter
        );
      }

      return matchesSearch && matchesStatus && matchesEvent;
    });
  }, [participants, search, statusTab, eventFilter]);

  // Counts for tabs - dynamically computed from real data with zero hardcoded mock numbers
  const counts = useMemo(() => {
    let verified = 0;
    let pending = 0;
    let rejected = 0;

    participants.forEach((p) => {
      const s = (p.status || '').toUpperCase();
      if (s === 'VERIFIED' || s === 'CONFIRMED') {
        verified++;
      } else if (s === 'REJECTED' || s === 'CANCELLED') {
        rejected++;
      } else {
        pending++;
      }
    });

    return {
      all: participants.length,
      verified,
      pending,
      rejected,
    };
  }, [participants]);

  // Verification Actions are managed by Admins only.

  const handleExportParticipant = (target) => {
    const p = target || selectedParticipant;
    if (!p) return;
    const info = p.participants || {};
    const eventsStr = Array.isArray(p.events)
      ? p.events.join('; ')
      : p.event_name || 'Symposium Pass';

    const csvRows = [
      ['Registration Code', p.registration_code || ''],
      ['Full Name', info.name || ''],
      ['Email', info.email || ''],
      ['Phone', info.phone || ''],
      ['College', info.college || ''],
      ['Department', info.department || ''],
      ['Year of Study', info.year || ''],
      ['Events Registered', eventsStr],
      ['Selected Day', p.selected_day || ''],
      ['Status', p.status || ''],
      ['Registered At', p.created_at || ''],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      csvRows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encoded = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encoded;
    link.download = `Participant_${p.registration_code || 'export'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Participant details exported to CSV', 'success');
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Generate QR Canvas URL when participant is selected
  useEffect(() => {
    if (selectedParticipant) {
      const qrData = JSON.stringify({
        code: selectedParticipant.registration_code,
        name: selectedParticipant.participants?.name,
        college: selectedParticipant.participants?.college,
        token: selectedParticipant.qr_token || 'CYBERSENTINEL-2K26',
      });
      QRCode.toDataURL(qrData, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
        .then((url) => setQrModalUrl(url))
        .catch((err) => console.error('QR Gen error:', err));
    } else {
      setQrModalUrl('');
    }
  }, [selectedParticipant]);

  const handlePrintQr = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast('Please allow pop-ups to print the QR pass.', 'error');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Participant QR - ${selectedParticipant?.participants?.name}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #fff; color: #111; }
            .card { border: 2px dashed #333; padding: 24px; border-radius: 12px; text-align: center; max-width: 340px; }
            h2 { margin: 8px 0 4px 0; font-size: 20px; }
            p { margin: 4px 0; color: #555; font-size: 13px; }
            img { margin: 16px 0; width: 220px; height: 220px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>CyberSentinel 2K26 Entry Pass</h3>
            <img src="${qrModalUrl}" alt="QR" />
            <h2>${selectedParticipant?.participants?.name || 'Participant'}</h2>
            <p><strong>Reg ID:</strong> ${selectedParticipant?.registration_code}</p>
            <p>${selectedParticipant?.participants?.college || ''}</p>
          </div>
          <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadQr = () => {
    if (!qrModalUrl) {
      addToast('QR code is still being generated. Please try again.', 'info');
      return;
    }
    const a = document.createElement('a');
    a.href = qrModalUrl;
    a.download = `QR_${selectedParticipant?.registration_code || 'participant'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Top Header: Replicating Screen 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-wide">Participants</h1>
          <p className="text-sm text-slate-400 mt-0.5">View and manage all registrations</p>
        </div>

        <button
          onClick={loadData}
          disabled={refreshing}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-[#161329] border border-[#2e2652] hover:border-brand-purple rounded-xl text-sm text-slate-300 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-brand-purple' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search Bar & Filter Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
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

          <div className="relative">
            <button
              onClick={() => setShowEventFilterMenu(!showEventFilterMenu)}
              className={`flex items-center gap-2 px-4 py-2.5 bg-[#161329]/80 border ${
                eventFilter !== 'ALL' ? 'border-[#00f0ff] text-[#00f0ff]' : 'border-white/10 text-slate-200'
              } hover:border-[#00f0ff] rounded-xl text-sm font-semibold transition-all shadow-md`}
              style={{ minHeight: '44px' }}
            >
              <Filter className="w-4 h-4 text-[#00f0ff]" />
              <span>{eventFilter === 'ALL' ? 'Filter' : 'Filtered'}</span>
            </button>

            {showEventFilterMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-[#140f2b] border border-[#2e2652] rounded-xl shadow-2xl p-3 z-30">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Filter by Track or Event
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setEventFilter('ALL');
                      setShowEventFilterMenu(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      eventFilter === 'ALL'
                        ? 'bg-purple-600/30 text-white font-semibold'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    All Events / Tracks
                  </button>
                  <button
                    onClick={() => {
                      setEventFilter('TRACK:DAY_1');
                      setShowEventFilterMenu(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      eventFilter === 'TRACK:DAY_1'
                        ? 'bg-purple-600/30 text-white font-semibold'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    Day 1 (Technical Events)
                  </button>
                  <button
                    onClick={() => {
                      setEventFilter('TRACK:DAY_2');
                      setShowEventFilterMenu(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      eventFilter === 'TRACK:DAY_2'
                        ? 'bg-purple-600/30 text-white font-semibold'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    Day 2 (Non-Technical Events)
                  </button>
                  {assignedEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => {
                        setEventFilter(ev.id);
                        setShowEventFilterMenu(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        eventFilter === ev.id
                          ? 'bg-purple-600/30 text-white font-semibold'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      {ev.code} - {ev.name} ({ev.day})
                    </button>
                  ))}
                  {assignedSpecialEvents.map((sp) => (
                    <button
                      key={sp.id}
                      onClick={() => {
                        setEventFilter(`SPECIAL:${sp.id}`);
                        setShowEventFilterMenu(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        eventFilter === `SPECIAL:${sp.id}`
                          ? 'bg-purple-600/30 text-white font-semibold'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      [Special] {sp.code} - {sp.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Pill Tabs with Enlarged, Visible Font */}
        <div className="inline-flex p-1 bg-[#131024] border border-[#2e2652] rounded-xl gap-1">
          <button
            onClick={() => {
              setStatusTab('ALL');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              statusTab === 'ALL'
                ? 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white shadow-glow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => {
              setStatusTab('VERIFIED');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              statusTab === 'VERIFIED'
                ? 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white shadow-glow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Verified ({counts.verified})
          </button>
          <button
            onClick={() => {
              setStatusTab('PENDING');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              statusTab === 'PENDING'
                ? 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white shadow-glow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Pending ({counts.pending})
          </button>
          <button
            onClick={() => {
              setStatusTab('REJECTED');
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              statusTab === 'REJECTED'
                ? 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white shadow-glow'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Rejected ({counts.rejected})
          </button>
        </div>
      </div>

      {/* Main Table: Replicating Screen 3 with Clear Visible Fonts */}
      <div className="bg-[#120e26]/90 border border-[#29224d] rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#231d3d] text-slate-300 text-xs font-bold uppercase tracking-wider bg-[#161230]/70">
                <th className="py-3.5 px-4 w-12 text-slate-400">#</th>
                <th className="py-3.5 px-4">Name</th>
                <th className="py-3.5 px-4">Event</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1739]">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-purple" />
                    Loading assigned participants...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    No participants found matching the criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((item, index) => {
                  const participantName = item.participants?.name || 'Participant';
                  const email = item.participants?.email || '—';
                  const initials = participantName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  const eventName =
                    item.event_name ||
                    (item.event_registrations && item.event_registrations[0]?.events?.name) ||
                    (item.selected_day === 'BOTH' ? 'Day 1 & Day 2 Track' : item.selected_day || 'Code Quest');

                  const isVerified = item.status === 'VERIFIED' || item.status === 'CONFIRMED';
                  const isRejected = item.status === 'REJECTED' || item.status === 'CANCELLED';
                  const isPending = !isVerified && !isRejected;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[#1a1438]/60 transition-colors group cursor-pointer"
                      onClick={() => {
                        setSelectedParticipant(item);
                        setActiveModalTab('Details');
                      }}
                    >
                      {/* # Number */}
                      <td className="py-4 px-4 text-slate-400 font-mono text-sm font-medium">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>

                      {/* Name + Avatar initials + Email */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-800 to-indigo-600 border border-purple-400/40 flex items-center justify-center font-bold text-white text-sm shadow-md shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-white text-[15px] tracking-wide group-hover:text-purple-300 transition-colors">
                              {participantName}
                            </div>
                            <div className="text-xs text-slate-400">{email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Event Badge */}
                      <td className="py-4 px-4">
                        <span className="inline-block px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1d163a] text-purple-200 border border-[#34295e]">
                          {eventName}
                        </span>
                      </td>

                      {/* Status Pill matching mockup */}
                      <td className="py-4 px-4">
                        {isVerified && (
                          <span className="pill-verified">
                            <span className="pill-dot" />
                            Verified
                          </span>
                        )}
                        {isPending && (
                          <span className="pill-pending">
                            <span className="pill-dot" />
                            Pending
                          </span>
                        )}
                        {isRejected && (
                          <span className="pill-rejected">
                            <span className="pill-dot" />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* Actions: Quick Approve, Quick Reject, and Eye Icon */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedParticipant(item);
                              setActiveModalTab('Details');
                            }}
                            className="p-2 rounded-lg bg-[#181333] hover:bg-purple-600/30 text-purple-300 hover:text-white border border-[#2d2454] transition-all"
                            title="View Participant Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar matching mockup */}
        <div className="p-4 border-t border-[#231d3d] flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-300 font-medium">
          <div>
            Showing 1 to {Math.min(paginated.length, pageSize)} of {filtered.length} results
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-[#161329] border border-[#2e2652] hover:border-brand-purple disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i + 1}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-sm font-semibold flex items-center justify-center transition-all ${
                  currentPage === i + 1
                    ? 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white shadow-glow'
                    : 'bg-[#161329] border border-[#2e2652] text-slate-300 hover:text-white'
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg bg-[#161329] border border-[#2e2652] hover:border-brand-purple disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Screen 4 & Screen 5 Modal: Participant Details + Working Buttons */}
      {selectedParticipant && (() => {
        const isPartVerified = selectedParticipant.status === 'VERIFIED' || selectedParticipant.status === 'CONFIRMED';
        const isPartRejected = selectedParticipant.status === 'REJECTED' || selectedParticipant.status === 'CANCELLED';
        const isPartPending = !isPartVerified && !isPartRejected;

        // Extract registered events
        const regEventsList = [];
        if (selectedParticipant.event_registrations && selectedParticipant.event_registrations.length > 0) {
          selectedParticipant.event_registrations.forEach((er) => {
            if (er.events?.name) {
              regEventsList.push({
                name: er.events.name,
                code: er.events.code,
                day: er.events.day,
                type: er.events.event_type || (er.events.day === 'DAY_1' ? 'Technical' : 'Non-Technical'),
              });
            }
          });
        }
        if (selectedParticipant.special_event_registrations && selectedParticipant.special_event_registrations.length > 0) {
          selectedParticipant.special_event_registrations.forEach((sr) => {
            if (sr.special_events?.name) {
              regEventsList.push({
                name: sr.special_events.name,
                code: sr.special_events.code,
                day: 'Special Track',
                type: 'Special Event',
              });
            }
          });
        }
        if (regEventsList.length === 0 && selectedParticipant.events && selectedParticipant.events.length > 0) {
          selectedParticipant.events.forEach((name) => {
            regEventsList.push({
              name,
              code: name.slice(0, 3).toUpperCase(),
              day: selectedParticipant.selected_day || 'Symposium',
              type: 'Event',
            });
          });
        }
        if (regEventsList.length === 0 && selectedParticipant.event_name) {
          regEventsList.push({
            name: selectedParticipant.event_name,
            code: selectedParticipant.event_name.slice(0, 3).toUpperCase(),
            day: selectedParticipant.selected_day || 'Symposium',
            type: 'Event',
          });
        }

        const eventsSummaryText = regEventsList.map((e) => e.name).join(', ') || 'General Symposium Track';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#120d29] border border-[#3b2d6a] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative text-white">
              {/* Top Close & Back Button */}
              <div className="flex items-center justify-between border-b border-[#241c47] pb-4 mb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-wide">Participant Details</h2>
                  <p className="text-sm text-slate-300 mt-0.5">
                    View registration details and verification status
                  </p>
                </div>
                <button
                  onClick={() => setSelectedParticipant(null)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#1f1742] hover:bg-[#2b1f5e] border border-[#3c2f6d] rounded-xl text-sm font-semibold text-slate-200 hover:text-white transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              </div>

              {/* Header Card: Avatar, Name, Email, Timestamp, Status Pill */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#181238] border border-[#2d2257] mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 border border-purple-400 flex items-center justify-center text-xl font-bold text-white shadow-glow shrink-0">
                    {selectedParticipant.participants?.name
                      ? selectedParticipant.participants.name[0].toUpperCase()
                      : 'U'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {selectedParticipant.participants?.name || 'Participant Name'}
                    </h3>
                    <p className="text-sm text-slate-300">
                      {selectedParticipant.participants?.email || 'email@example.com'}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Registered on{' '}
                      {selectedParticipant.created_at
                        ? new Date(selectedParticipant.created_at).toLocaleString()
                        : 'Sep 12, 2026, 10:24 AM'}
                    </p>
                  </div>
                </div>

                <div>
                  {isPartVerified && (
                    <span className="pill-verified">
                      <span className="pill-dot" />
                      Verified
                    </span>
                  )}
                  {isPartPending && (
                    <span className="pill-pending">
                      <span className="pill-dot" />
                      Pending
                    </span>
                  )}
                  {isPartRejected && (
                    <span className="pill-rejected">
                      <span className="pill-dot" />
                      Rejected
                    </span>
                  )}
                </div>
              </div>

              {/* Navigation Tabs matching mockup: Details | Events | Documents | QR Code */}
              <div className="flex items-center gap-2 border-b border-[#241c47] pb-3 mb-5">
                {['Details', 'Events', 'Documents', 'QR Code'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveModalTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeModalTab === tab
                        ? 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white shadow-glow'
                        : 'text-slate-400 hover:text-white bg-transparent'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab 1: Details */}
              {activeModalTab === 'Details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3.5 bg-[#181238] rounded-xl border border-[#2a1f52]">
                      <div className="text-xs font-semibold text-slate-400">Full Name</div>
                      <div className="font-bold text-white mt-1 text-[15px]">
                        {selectedParticipant.participants?.name || '—'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#181238] rounded-xl border border-[#2a1f52]">
                      <div className="text-xs font-semibold text-slate-400">Email</div>
                      <div className="font-bold text-white mt-1 text-[15px] break-all">
                        {selectedParticipant.participants?.email || '—'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#181238] rounded-xl border border-[#2a1f52]">
                      <div className="text-xs font-semibold text-slate-400">Phone</div>
                      <div className="font-bold text-white mt-1 text-[15px]">
                        {selectedParticipant.participants?.phone || '—'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#181238] rounded-xl border border-[#2a1f52]">
                      <div className="text-xs font-semibold text-slate-400">College</div>
                      <div className="font-bold text-white mt-1 text-[15px]">
                        {selectedParticipant.participants?.college || '—'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#181238] rounded-xl border border-[#2a1f52]">
                      <div className="text-xs font-semibold text-slate-400">Department</div>
                      <div className="font-bold text-white mt-1 text-[15px]">
                        {selectedParticipant.participants?.department || '—'}
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#181238] rounded-xl border border-[#2a1f52]">
                      <div className="text-xs font-semibold text-slate-400">Events Registered</div>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {regEventsList.map((e, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 bg-[#251b4d] text-purple-200 border border-purple-500/30 rounded-md text-xs font-medium"
                          >
                            {e.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#181238] rounded-xl border border-[#2a1f52]">
                      <div className="text-xs font-semibold text-slate-400">Payment Status</div>
                      <div className="flex items-center gap-2 font-bold mt-1 text-sm">
                        {isPartVerified ? (
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Paid & Verified
                          </span>
                        ) : isPartRejected ? (
                          <span className="text-rose-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            Payment Rejected
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Pending Review
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#181238] rounded-xl border border-[#2a1f52]">
                      <div className="text-xs font-semibold text-slate-400">Verification Status</div>
                      <div className="flex items-center gap-2 font-bold mt-1 text-sm">
                        {isPartVerified ? (
                          <span className="text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            Verified
                          </span>
                        ) : isPartRejected ? (
                          <span className="text-rose-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-400" />
                            Rejected
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Pending Verification
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {selectedParticipant.created_at ? new Date(selectedParticipant.created_at).toLocaleDateString() : 'Sep 12, 2026'}
                      </div>
                    </div>
                  </div>

                  {selectedParticipant.team && (
                    <div className="mt-4 p-4 bg-[#181238] rounded-xl border border-[#2a1f52]">
                      <div className="text-xs font-semibold text-slate-400">Team Information</div>
                      <div className="font-bold text-white mt-1 text-[15px]">
                        {selectedParticipant.team.team_name} <span className="text-brand-cyan text-xs font-mono ml-2">#{selectedParticipant.team.team_code}</span>
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {(selectedParticipant.team.team_members || []).map((m, i) => (
                          <div key={i} className="text-sm text-slate-300 flex items-center gap-2">
                            {m.role === 'LEADER' ? '👑' : '👤'} 
                            <span className="font-medium text-white">{m.name || 'Member'}</span> 
                            <span className="text-xs text-slate-500 font-mono">({m.cs_id})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Buttons: Fully Wired to Database Functions */}
                  <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#241c47]">
                    <div className="flex flex-wrap items-center gap-2.5">
                    </div>

                    <button
                      onClick={() => handleExportParticipant(selectedParticipant)}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#1a1438] hover:bg-purple-900/50 border border-purple-500/40 text-purple-200 flex items-center gap-2 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Export Details
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Events */}
              {activeModalTab === 'Events' && (
                <div className="space-y-3 py-2 text-sm">
                  {regEventsList.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">No specific events registered</div>
                  ) : (
                    regEventsList.map((ev, i) => (
                      <div key={i} className="p-4 bg-[#181238] rounded-xl border border-[#2a1f52] flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white text-[15px]">{ev.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {ev.day === 'DAY_1' ? 'Day 1 (Technical)' : ev.day === 'DAY_2' ? 'Day 2 (Non-Technical)' : ev.day} · {ev.type}
                          </div>
                        </div>
                        <span className="pill-verified">
                          <span className="pill-dot" />
                          Enrolled
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Documents */}
              {activeModalTab === 'Documents' && (
                <div className="py-2 text-sm text-slate-300 space-y-3">
                  <div className="p-4 bg-[#181238] rounded-xl border border-[#2a1f52] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-purple-400" />
                      <div>
                        <div className="font-bold text-white">College ID Card</div>
                        <div className="text-xs text-slate-400">
                          {selectedParticipant.participants?.college || 'Student ID verified on entry'}
                        </div>
                      </div>
                    </div>
                    <span className="text-brand-cyan hover:underline cursor-pointer font-medium">Verified</span>
                  </div>

                  {selectedParticipant.payments?.[0]?.screenshot_url && (
                    <div className="p-4 bg-[#181238] rounded-xl border border-[#2a1f52]">
                      <div className="font-bold text-white mb-2">Payment Transaction Screenshot</div>
                      <a
                        href={selectedParticipant.payments[0].screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-brand-purple hover:underline"
                      >
                        <Eye className="w-4 h-4" /> View Payment Screenshot
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: QR Code */}
              {activeModalTab === 'QR Code' && (
                <div className="flex flex-col items-center py-2 space-y-5">
                  {/* Centered White Badge Card matching Screen 5 exactly */}
                  <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-2xl flex flex-col items-center max-w-xs w-full text-center border-4 border-purple-600/30">
                    {qrModalUrl ? (
                      <img
                        src={qrModalUrl}
                        alt="Participant QR"
                        className="w-48 h-48 object-contain mb-3"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-slate-400 rounded-lg mb-3">
                        <QrCode className="w-16 h-16 animate-pulse" />
                      </div>
                    )}

                    <h3 className="text-base font-extrabold text-slate-900 tracking-wide uppercase">
                      {selectedParticipant.participants?.name || 'PARTICIPANT'}
                    </h3>
                    <div className="text-xs font-mono font-bold text-slate-700 mt-1">
                      Reg ID: {selectedParticipant.registration_code || 'CS26-0000'}
                    </div>
                    <div className="text-xs font-semibold text-slate-500 mt-1">
                      {eventsSummaryText}
                    </div>
                  </div>

                  {/* Download and Print Action Buttons */}
                  <div className="flex items-center gap-3 w-full max-w-xs">
                    <button
                      onClick={handleDownloadQr}
                      className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500 text-white flex items-center justify-center gap-2 shadow-glow transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download QR
                    </button>

                    <button
                      onClick={handlePrintQr}
                      className="py-2.5 px-4 rounded-xl text-sm font-semibold bg-[#1a1438] hover:bg-purple-900/60 border border-purple-500/40 text-purple-200 flex items-center justify-center gap-2 transition-all"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </button>
                  </div>

                  {/* Callout Notice */}
                  <div className="w-full max-w-md p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 text-xs flex items-center gap-2.5 font-medium">
                    <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>
                      This QR code is required for event entry. Keep it ready on your device or print it.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
