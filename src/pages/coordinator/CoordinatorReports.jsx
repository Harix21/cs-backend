import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getCoordinatorAssignedEvents } from '../../services/coordinatorService';
import {
  exportCoordinatorParticipantsReport,
  exportCoordinatorParticipantsPdfReport,
  exportCoordinatorAttendanceReport,
  exportCoordinatorAttendancePdfReport,
} from '../../services/reportService';
import {
  FileSpreadsheet,
  FileText,
  Download,
  Users,
  UserCheck,
  RefreshCw,
  Layers,
  Shield,
} from 'lucide-react';

export default function CoordinatorReports() {
  const { user, coordinatorProfile, getCoordinatorClientInstance } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [assignedSpecialEvents, setAssignedSpecialEvents] = useState([]);
  const [exportingType, setExportingType] = useState(null);

  const client = getCoordinatorClientInstance();

  useEffect(() => {
    async function loadEvents() {
      try {
        const coordId = user?.id || coordinatorProfile?.id;
        let normalEvents = [];
        let specialEvents = [];
        if (coordId) {
          try {
            const eventsData = await getCoordinatorAssignedEvents(client, coordId);
            normalEvents = eventsData.normalEvents || [];
            specialEvents = eventsData.specialEvents || [];
          } catch (evErr) {
            console.warn('Coordinator reports events error:', evErr);
          }
        }
        setAssignedEvents(normalEvents);
        setAssignedSpecialEvents(specialEvents);
      } catch (err) {
        console.warn('Coordinator reports error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const allAssigned = [...assignedEvents, ...assignedSpecialEvents];
  const coordinatorInfo = {
    name: coordinatorProfile?.name || user?.name || 'Coordinator Desk',
    email: coordinatorProfile?.email || user?.email || '',
  };

  // 1. Participants Roster Handlers
  const handleExportParticipantsPdf = async () => {
    try {
      setExportingType('participants-pdf');
      await exportCoordinatorParticipantsPdfReport(
        client,
        assignedEvents,
        assignedSpecialEvents,
        coordinatorInfo
      );
      addToast('Coordinator Participants PDF generated successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to export participants PDF', 'error');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportParticipantsCsv = async () => {
    try {
      setExportingType('participants-csv');
      await exportCoordinatorParticipantsReport(
        client,
        assignedEvents,
        assignedSpecialEvents,
        coordinatorInfo
      );
      addToast('Coordinator Participants Excel Sheet (.CSV) downloaded!', 'success');
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to export participants Excel sheet', 'error');
    } finally {
      setExportingType(null);
    }
  };

  // 2. Attendance Sheet Handlers
  const handleExportAttendancePdf = async () => {
    try {
      setExportingType('attendance-pdf');
      await exportCoordinatorAttendancePdfReport(
        client,
        assignedEvents,
        assignedSpecialEvents,
        coordinatorInfo
      );
      addToast('Coordinator Attendance PDF generated successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to export attendance PDF', 'error');
    } finally {
      setExportingType(null);
    }
  };

  const handleExportAttendanceCsv = async () => {
    try {
      setExportingType('attendance-csv');
      await exportCoordinatorAttendanceReport(
        client,
        assignedEvents,
        assignedSpecialEvents,
        coordinatorInfo
      );
      addToast('Coordinator Attendance Excel Sheet (.CSV) downloaded!', 'success');
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to export attendance Excel sheet', 'error');
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyan-300 mb-2">
          <Shield className="w-3.5 h-3.5 text-[#00f0ff]" />
          <span>COORDINATOR ACCREDITATION SUITE</span>
        </div>
        <h1 className="text-2xl font-bold font-heading text-white flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-brand-cyan" />
          <span>Coordinator Reports & PDF Exports</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Export verified participant rosters and live attendance accreditation sheets scoped to your assigned events.
        </p>
      </div>

      {/* Scope Banner */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-brand-cyan/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Assigned Event Scope
            </div>
            <div className="text-sm font-medium text-white">
              {allAssigned.length > 0
                ? allAssigned.map((e) => `${e.code || ''} (${e.name})`).join(', ')
                : 'All Track Competitions'}
            </div>
          </div>
        </div>

        <span className="badge-outline text-xs text-brand-cyan border-brand-cyan/30 self-start sm:self-auto">
          {allAssigned.length > 0 ? `${allAssigned.length} Assigned Event(s)` : 'General Scope'}
        </span>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Participants Export */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-4 hover:border-brand-cyan/40 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-heading text-white">
              Assigned Participants Roster
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Export complete verified roster of registered participants in your events including Registration ID (CS-ID), Name, College & Department, Year, Contact details, and Official Status.
            </p>
          </div>

          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            {/* Primary PDF Button */}
            <button
              id="download-participants-pdf-btn"
              onClick={handleExportParticipantsPdf}
              disabled={loading || exportingType === 'participants-pdf'}
              className="w-full py-2.5 px-4 rounded-xl font-bold font-heading text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 shadow-lg text-white hover:brightness-110 active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
                border: '1.5px solid rgba(0, 240, 255, 0.55)',
                boxShadow: '0 0 15px rgba(0, 240, 255, 0.25)',
              }}
            >
              {exportingType === 'participants-pdf' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-[#00f0ff]" />
              ) : (
                <FileText className="w-4 h-4 text-[#00f0ff]" />
              )}
              <span>Download Participants PDF</span>
            </button>

            {/* Excel Form Button */}
            <button
              id="download-participants-excel-btn"
              onClick={handleExportParticipantsCsv}
              disabled={loading || exportingType === 'participants-csv'}
              className="w-full py-2.5 px-4 rounded-xl font-bold font-heading text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 shadow-lg text-white hover:brightness-110 active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.28) 0%, rgba(5, 150, 105, 0.22) 100%)',
                border: '1.5px solid rgba(16, 185, 129, 0.55)',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.25)',
              }}
            >
              {exportingType === 'participants-csv' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              )}
              <span>Download Participants Excel (.CSV)</span>
            </button>
          </div>
        </div>

        {/* Attendance Export */}
        <div className="glass-card p-6 flex flex-col justify-between space-y-4 hover:border-brand-purple/40 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-brand-purple/10 border border-brand-purple/30 flex items-center justify-center text-brand-purple">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold font-heading text-white">
              Event Attendance Accreditation Sheet
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Export verified check-in data for your assigned tracks including CS-ID, Participant Name, Institution, Check-In Time, and Attendance status (PRESENT/ABSENT).
            </p>
          </div>

          <div className="pt-4 border-t border-white/[0.08] space-y-3">
            {/* Primary PDF Button */}
            <button
              id="download-attendance-pdf-btn"
              onClick={handleExportAttendancePdf}
              disabled={loading || exportingType === 'attendance-pdf'}
              className="w-full py-2.5 px-4 rounded-xl font-bold font-heading text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 shadow-lg text-white hover:brightness-110 active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.3) 0%, rgba(236, 72, 153, 0.25) 100%)',
                border: '1.5px solid rgba(168, 85, 247, 0.55)',
                boxShadow: '0 0 15px rgba(168, 85, 247, 0.25)',
              }}
            >
              {exportingType === 'attendance-pdf' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-purple-300" />
              ) : (
                <FileText className="w-4 h-4 text-purple-300" />
              )}
              <span>Download Attendance PDF</span>
            </button>

            {/* Excel Form Button */}
            <button
              id="download-attendance-excel-btn"
              onClick={handleExportAttendanceCsv}
              disabled={loading || exportingType === 'attendance-csv'}
              className="w-full py-2.5 px-4 rounded-xl font-bold font-heading text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 shadow-lg text-white hover:brightness-110 active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.28) 0%, rgba(5, 150, 105, 0.22) 100%)',
                border: '1.5px solid rgba(16, 185, 129, 0.55)',
                boxShadow: '0 0 15px rgba(16, 185, 129, 0.25)',
              }}
            >
              {exportingType === 'attendance-csv' ? (
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              )}
              <span>Download Attendance Excel (.CSV)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
