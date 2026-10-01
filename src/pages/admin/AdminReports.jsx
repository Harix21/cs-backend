import React, { useState } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  exportRegistrationsReport,
  exportRegistrationsPdfReport,
  exportPaymentsReport,
  exportPaymentsPdfReport,
  exportAttendanceReport,
  exportAttendancePdfReport,
  exportTeamsReport,
  exportTeamsPdfReport,
  exportEventMatrixReport,
  exportEventMatrixPdfReport,
} from '../../services/reportService';
import { FileText, Download, CheckCircle, Database, FileSpreadsheet, RefreshCw, Sparkles, Shield } from 'lucide-react';

export function AdminReports() {
  const { addToast } = useToast();
  const [downloading, setDownloading] = useState('');

  const reportItems = [
    {
      id: 'registrations',
      title: 'Registrations Master Report',
      description: 'Comprehensive roster of all participants with college, department, phone, team, and verification status.',
      csvAction: exportRegistrationsReport,
      pdfAction: exportRegistrationsPdfReport,
      badge: 'Master Roster',
      color: '#00f0ff',
    },
    {
      id: 'payments',
      title: 'Payment Reconciliation Report',
      description: 'Detailed financial log with UTR numbers, amounts, participant college, and verification states.',
      csvAction: exportPaymentsReport,
      pdfAction: exportPaymentsPdfReport,
      badge: 'Finance Audit',
      color: '#10b981',
    },
    {
      id: 'attendance',
      title: 'Main Gate & Meal Attendance',
      description: 'Cross-tabulated attendance audit per day including food token issuance status (AVAILABLE / CLAIMED).',
      csvAction: exportAttendanceReport,
      pdfAction: exportAttendancePdfReport,
      badge: 'Security Gate',
      color: '#a855f7',
    },
    {
      id: 'teams',
      title: 'Team Members & Roster Report',
      description: 'Directory of all created teams, assigned team codes, leaders, and registered members.',
      csvAction: exportTeamsReport,
      pdfAction: exportTeamsPdfReport,
      badge: 'Hackathon',
      color: '#ec4899',
    },
    {
      id: 'matrix',
      title: 'Event Attendance Matrix',
      description: 'Multi-column matrix showing PRESENT vs ABSENT check-ins across every individual technical event.',
      csvAction: exportEventMatrixReport,
      pdfAction: exportEventMatrixPdfReport,
      badge: 'Event Matrix',
      color: '#f59e0b',
    },
  ];

  async function handleExport(report, type = 'pdf') {
    const actionKey = `${report.id}-${type}`;
    setDownloading(actionKey);
    try {
      if (type === 'pdf') {
        await report.pdfAction();
        addToast({
          title: 'PDF Report Generated',
          message: `${report.title} PDF downloaded successfully!`,
          type: 'success',
        });
      } else {
        await report.csvAction();
        addToast({
          title: 'CSV Export Generated',
          message: `${report.title} CSV downloaded successfully.`,
          type: 'success',
        });
      }
    } catch (err) {
      addToast({
        title: 'Export Failed',
        message: err.message || 'Could not generate report.',
        type: 'error',
      });
    } finally {
      setDownloading('');
    }
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyan-300 mb-2">
            <Shield className="w-3.5 h-3.5 text-[#00f0ff]" />
            <span>EXECUTIVE AUDIT SUITE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
            Data Exports & Official Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Generate executive PDF accreditations and CSV datasets for symposium audits, certificate verification, and financial reconciliation.
          </p>
        </div>
      </div>

      {/* Grid of Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportItems.map((rep) => {
          const isPdfDownloading = downloading === `${rep.id}-pdf`;
          const isCsvDownloading = downloading === `${rep.id}-csv`;

          return (
            <div
              key={rep.id}
              className="glass-card relative overflow-hidden flex flex-col justify-between p-6 hover:border-cyan-500/40 transition-all duration-300 group"
              style={{
                background: 'rgba(6, 11, 26, 0.85)',
                border: '1.2px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              {/* Top Accent Strip in Report Color */}
              <div
                className="absolute top-0 left-0 right-0 h-1 transition-opacity duration-300 opacity-80 group-hover:opacity-100"
                style={{
                  background: `linear-gradient(90deg, ${rep.color}, transparent)`,
                  boxShadow: `0 0 10px ${rep.color}`,
                }}
              />

              <div>
                {/* Header Icon & Tag */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                    style={{
                      background: `${rep.color}15`,
                      border: `1.5px solid ${rep.color}50`,
                      color: rep.color,
                      boxShadow: `0 0 14px ${rep.color}30`,
                    }}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <span
                    className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wider uppercase"
                    style={{
                      background: `${rep.color}15`,
                      color: rep.color,
                      border: `1px solid ${rep.color}40`,
                    }}
                  >
                    {rep.badge}
                  </span>
                </div>

                {/* Title & Description */}
                <h2 className="text-lg font-bold font-heading text-white mb-2 leading-snug group-hover:text-cyan-300 transition-colors">
                  {rep.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                  {rep.description}
                </p>
              </div>

              {/* Action Buttons: PDF (Primary) & CSV (Secondary) */}
              <div className="space-y-2.5 pt-4 border-t border-white/[0.08]">
                {/* Primary PDF Download Button */}
                <button
                  type="button"
                  disabled={Boolean(downloading)}
                  onClick={() => handleExport(rep, 'pdf')}
                  className="w-full py-2.5 px-4 rounded-xl font-bold font-heading text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-200 shadow-lg text-white"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
                    border: '1.5px solid rgba(0, 240, 255, 0.55)',
                    boxShadow: '0 0 15px rgba(0, 240, 255, 0.25)',
                  }}
                >
                  {isPdfDownloading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00f0ff]" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-[#00f0ff]" />
                  )}
                  <span>{isPdfDownloading ? 'Building PDF...' : 'Download Official PDF'}</span>
                </button>

                {/* Secondary CSV Download Button */}
                <button
                  type="button"
                  disabled={Boolean(downloading)}
                  onClick={() => handleExport(rep, 'csv')}
                  className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.1] flex items-center justify-center gap-2 transition-colors"
                >
                  {isCsvDownloading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>{isCsvDownloading ? 'Exporting CSV...' : 'Export Raw CSV'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminReports;
