import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getCoordinatorAssignedEvents,
  inspectCoordinatorEventAttendance,
  recordCoordinatorEventAttendance,
  getCoordinatorAttendanceList,
} from '../../services/coordinatorService';
import QrScannerModal from '../../components/common/QrScannerModal';
import StatusBadge from '../../components/ui/StatusBadge';
import DetailsModal from '../../components/common/DetailsModal';
import { formatDate } from '../../utils/helpers';
import {
  QrCode,
  Camera,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Layers,
  Clock,
  UserCheck,
  Eye,
} from 'lucide-react';

export default function CoordinatorAttendance() {
  const { user, getCoordinatorClientInstance } = useAuth();
  const { addToast } = useToast();

  const [assignedEvents, setAssignedEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [recentScans, setRecentScans] = useState([]);
  const [loadingScans, setLoadingScans] = useState(false);

  // Scanner & Inspection State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [inspecting, setInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState(null);
  const [recording, setRecording] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);

  const client = getCoordinatorClientInstance();

  useEffect(() => {
    async function loadEvents() {
      try {
        const coordId = user?.id || coordinatorProfile?.id;
        let normalEvents = [];
        if (coordId) {
          try {
            const eventsData = await getCoordinatorAssignedEvents(client, coordId);
            normalEvents = eventsData.normalEvents || [];
          } catch (evErr) {
            console.warn('Coordinator attendance events error:', evErr);
          }
        }
        setAssignedEvents(normalEvents);
        if (normalEvents.length > 0) {
          setSelectedEventId(normalEvents[0].id);
        }
      } catch (err) {
        console.warn('Coordinator attendance error:', err);
      }
    }
    loadEvents();
  }, []);

  const loadAttendance = async (eventId) => {
    if (!eventId) return;
    try {
      setLoadingScans(true);
      const list = await getCoordinatorAttendanceList(client, eventId);
      setRecentScans(list);
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to load attendance list', 'error');
    } finally {
      setLoadingScans(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      setInspectionResult(null);
      loadAttendance(selectedEventId);
    }
  }, [selectedEventId]);

  const handleInspect = async (qrToken, regCode) => {
    if (!selectedEventId) {
      addToast('Please select an event before scanning', 'error');
      return;
    }

    try {
      setInspecting(true);
      const result = await inspectCoordinatorEventAttendance(
        client,
        qrToken || null,
        selectedEventId,
        regCode || null
      );

      setInspectionResult(result);
      if (result.already_marked) {
        addToast('Participant already marked PRESENT for this event', 'info');
      } else if (!result.eligible && !result.is_registered) {
        addToast('Participant is not registered for this event!', 'error');
      } else {
        addToast('Participant verified! Ready to record.', 'success');
      }
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to inspect attendance', 'error');
      setInspectionResult(null);
    } finally {
      setInspecting(false);
    }
  };

  const handleManualLookup = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleInspect(null, manualCode.trim());
  };

  const handleRecordAttendance = async () => {
    if (!inspectionResult || !selectedEventId) return;

    try {
      setRecording(true);
      const res = await recordCoordinatorEventAttendance(
        client,
        inspectionResult.qr_token,
        selectedEventId
      );

      addToast(
        res?.message || `Attendance recorded for ${inspectionResult.registration_code}!`,
        'success'
      );
      setInspectionResult(null);
      setManualCode('');
      loadAttendance(selectedEventId);
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to record attendance', 'error');
    } finally {
      setRecording(false);
    }
  };

  const currentEvent = assignedEvents.find((e) => e.id === selectedEventId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-brand-cyan" />
            Event Attendance Scanner
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Scan participant badges or enter Registration ID to verify and mark event attendance.
          </p>
        </div>

        {/* Event Selector */}
        <div className="w-full sm:w-72">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Active Event
          </label>
          <div className="relative">
            <Layers className="w-4 h-4 text-brand-cyan absolute left-3 top-1/2 -translate-y-1/2" />
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="cyber-input pl-9 text-sm w-full font-medium"
            >
              {assignedEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.code} · {ev.name} ({ev.day})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner & Lookup Input */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-card p-6 border-brand-cyan/20">
            <h2 className="text-lg font-bold font-heading text-white mb-4 flex items-center justify-between">
              <span>Scan or Lookup Badge</span>
              {currentEvent && (
                <span className="badge-outline text-xs text-brand-cyan border-brand-cyan/30">
                  {currentEvent.code} ({currentEvent.day})
                </span>
              )}
            </h2>

            {/* Camera Trigger */}
            <div className="space-y-4">
              <button
                onClick={() => setScannerOpen(true)}
                disabled={!selectedEventId}
                className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-brand-cyan/20 to-brand-blue/20 hover:from-brand-cyan/30 hover:to-brand-blue/30 border border-brand-cyan/40 text-brand-cyan hover:text-white font-semibold flex items-center justify-center gap-3 transition-all group shadow-glow"
              >
                <Camera className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span className="text-base">Launch Camera QR Scanner</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-cyber-border"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                  OR ENTER CODE
                </span>
                <div className="flex-grow border-t border-cyber-border"></div>
              </div>

              {/* Manual Lookup Form */}
              <form onSubmit={handleManualLookup} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. CS-26-0001 or raw token..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="cyber-input pl-10 text-sm w-full font-mono uppercase"
                  />
                </div>
                <button
                  type="submit"
                  disabled={inspecting || !manualCode.trim() || !selectedEventId}
                  className="btn-primary text-sm px-5 flex items-center gap-2"
                >
                  {inspecting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Lookup</span>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Inspection / Confirmation Result Box */}
          {inspectionResult && (
            <div
              className={`glass-card p-6 border-2 transition-all ${
                inspectionResult.already_marked
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : !inspectionResult.is_registered
                  ? 'border-rose-500/40 bg-rose-500/5'
                  : 'border-emerald-500/50 bg-emerald-500/5'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xl font-bold text-white">
                      {inspectionResult.registration_code}
                    </span>
                    <span className="badge-outline text-xs">
                      {inspectionResult.selected_day}
                    </span>
                  </div>
                  <div className="text-base font-medium text-slate-200">
                    {inspectionResult.participant_name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {inspectionResult.college} · {inspectionResult.department}
                  </div>
                </div>

                <div className="text-right">
                  {inspectionResult.already_marked ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Already Marked
                    </span>
                  ) : !inspectionResult.is_registered ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Not Registered
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Status details */}
              <div className="mt-4 pt-4 border-t border-cyber-border space-y-2 text-xs">
                {inspectionResult.already_marked && (
                  <p className="text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Attendance was previously recorded on:{' '}
                    {formatDate(inspectionResult.existing_scan_at)}
                  </p>
                )}

                {!inspectionResult.is_registered && (
                  <p className="text-rose-300">
                    Warning: This participant is not enrolled in event {currentEvent?.code} (Day {currentEvent?.day}).
                  </p>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setInspectionResult(null)}
                  className="btn-secondary text-sm flex-1"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleRecordAttendance}
                  disabled={recording || inspectionResult.already_marked}
                  className="btn-primary text-sm flex-1 bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2"
                >
                  {recording ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  <span>{inspectionResult.already_marked ? 'Already Marked' : 'Mark Present'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Live Attendance List */}
        <div className="lg:col-span-6 space-y-4">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold font-heading text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-brand-cyan" />
                  Recent Scans ({currentEvent?.code || 'Selected Event'})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Last 50 attendance records verified for this session
                </p>
              </div>

              <button
                onClick={() => loadAttendance(selectedEventId)}
                disabled={loadingScans || !selectedEventId}
                className="btn-ghost text-xs py-1 px-2 text-slate-400 hover:text-white"
                title="Refresh Attendance"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingScans ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingScans ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-brand-cyan" />
                <span className="text-xs">Loading records...</span>
              </div>
            ) : recentScans.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No attendance recorded yet for this event today.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                <table className="cyber-table text-xs">
                  <thead>
                    <tr>
                      <th>CS ID</th>
                      <th>Participant</th>
                      <th>Time</th>
                      <th>Scanned By</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentScans.map((rec) => (
                      <tr key={rec.id}>
                        <td className="font-mono font-medium text-brand-cyan">
                          {rec.registrations?.registration_code || rec.registration_id}
                        </td>
                        <td className="text-slate-200">
                          {rec.registrations?.participants?.name || '—'}
                        </td>
                        <td className="text-slate-400 whitespace-nowrap">
                          {formatDate(rec.scanned_at)}
                        </td>
                        <td className="text-slate-400 truncate max-w-[120px]" title={rec.scanned_by_email}>
                          {rec.scanned_by_email}
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => setSelectedRecord(rec)}
                            className="text-brand-cyan hover:underline inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QR Camera Scanner Modal */}
      {scannerOpen && (
        <QrScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanSuccess={(token) => {
            setScannerOpen(false);
            handleInspect(token, null);
          }}
          title={`Scan Badge - ${currentEvent?.name || 'Attendance'}`}
        />
      )}

      {/* Record Details Modal */}
      {selectedRecord && (
        <DetailsModal
          isOpen={!!selectedRecord}
          onClose={() => setSelectedRecord(null)}
          title={`Attendance Record: ${selectedRecord.registrations?.registration_code || ''}`}
          data={{
            registration_code: selectedRecord.registrations?.registration_code,
            participant_name: selectedRecord.registrations?.participants?.name,
            status: selectedRecord.status,
            scanned_at: formatDate(selectedRecord.scanned_at),
            scanned_by: selectedRecord.scanned_by_email,
            event_id: selectedEventId,
          }}
        />
      )}
    </div>
  );
}
