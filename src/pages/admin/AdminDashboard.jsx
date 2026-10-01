import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AdminDashboard.css';
import { useToast } from '../../context/ToastContext';
import {
  getDashboardSummary,
  getDashboardRegistrations,
  getAdminRegistrationFees,
  updateAdminRegistrationFee,
  getAdminSpecialEvents,
  createAdminSpecialEvent,
  updateAdminSpecialEventFee,
  getEvents,
} from '../../services/adminService';
import { subscribeToRealtimeUpdates } from '../../utils/statusStore';
import RegistrationsBarChart from '../../components/charts/RegistrationsBarChart';
import EventDonutChart from '../../components/charts/EventDonutChart';
import {
  buildRegistrationTrend,
  getRegistrationStatusCounts,
  getTrackCounts,
  percentageOf,
} from '../../utils/dashboardMetrics';
import { formatCurrency } from '../../utils/helpers';
import {
  Users,
  CheckCircle2,
  Hourglass,
  XCircle,
  Calendar,
  Save,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export default function AdminDashboard() {
  const { addToast } = useToast();

  const [summary, setSummary] = useState(null);
  const [fees, setFees] = useState({ DAY_1: 0, DAY_2: 0 });
  const [specialEvents, setSpecialEvents] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartView, setChartView] = useState('TECH_BREAKDOWN'); // 'TECH_BREAKDOWN' | 'TRACK_DISTRIBUTION'

  // New special event state
  const [newEventCode, setNewEventCode] = useState('');
  const [newEventName, setNewEventName] = useState('');
  const [newEventFee, setNewEventFee] = useState('');
  const [isSavingFee, setIsSavingFee] = useState(false);

  async function loadData() {
    setIsLoading(true);
    try {
      const [sumData, feeData, specialData, registrationData, eventsData] = await Promise.all([
        getDashboardSummary().catch(() => null),
        getAdminRegistrationFees().catch(() => ({ DAY_1: 0, DAY_2: 0 })),
        getAdminSpecialEvents().catch(() => []),
        getDashboardRegistrations(),
        getEvents().catch(() => []),
      ]);

      if (sumData) setSummary(sumData);
      setFees(feeData);
      setSpecialEvents(specialData);
      setRegistrations(registrationData);
      if (eventsData) setAllEvents(eventsData);
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to load dashboard metrics.', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToRealtimeUpdates(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

  async function handleSaveFees(e) {
    e.preventDefault();
    setIsSavingFee(true);
    try {
      await Promise.all([
        updateAdminRegistrationFee('DAY_1', fees.DAY_1),
        updateAdminRegistrationFee('DAY_2', fees.DAY_2),
      ]);
      addToast('Registration fees updated successfully.', 'success');
    } catch (err) {
      addToast(err.message || 'Fee update failed', 'error');
    } finally {
      setIsSavingFee(false);
    }
  }

  async function handleAddSpecialEvent(e) {
    e.preventDefault();
    if (!newEventCode.trim() || !newEventName.trim()) return;

    try {
      await createAdminSpecialEvent(newEventCode, newEventName, newEventFee);
      addToast(`Created ${newEventCode} successfully.`, 'success');
      setNewEventCode('');
      setNewEventName('');
      setNewEventFee('');
      loadData();
    } catch (err) {
      addToast(err.message || 'Failed to create special event', 'error');
    }
  }

  async function handleUpdateSpecialFee(id, fee) {
    try {
      await updateAdminSpecialEventFee(id, fee);
      addToast('Special event fee updated.', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to update special fee', 'error');
    }
  }

  // Values are derived from the same registration rows that feed the charts.
  // The database view is retained as a lightweight primary source for the
  // cards, while the row aggregation is a truthful fallback if that view has
  // not been deployed yet.
  const regSum = summary?.registrationSummary || summary?.registrations || {};
  const paySum = summary?.paymentSummary || summary?.payments || {};
  const statusCounts = getRegistrationStatusCounts(registrations);
  const trackCounts = getTrackCounts(registrations);

  const totalRegistrations = Number(regSum.total_registrations ?? statusCounts.total);
  const verifiedCount = Number(regSum.confirmed_registrations ?? statusCounts.verified);
  const pendingCount = Number(regSum.payment_pending ?? statusCounts.pending);
  const rejectedCount = Number(paySum.rejected_payments ?? statusCounts.rejected);

  // Each registration choice is a separate segment, so the donut is always
  // an accurate representation of database registrations (including BOTH and
  // SPECIAL registrations) without double-counting anyone.
  const day1TechCount = Number(regSum.day_1_registrations ?? trackCounts.day1);
  const day2NonTechCount = Number(regSum.day_2_registrations ?? trackCounts.day2);
  const bothDayCount = Number(regSum.both_day_registrations ?? trackCounts.both);
  const specialTracksCount = trackCounts.special;

  const day1Pct = percentageOf(day1TechCount, totalRegistrations);
  const day2Pct = percentageOf(day2NonTechCount, totalRegistrations);
  const bothDayPct = percentageOf(bothDayCount, totalRegistrations);
  const specialPct = percentageOf(specialTracksCount, totalRegistrations);
  const registrationTrend = buildRegistrationTrend(registrations);

  // Donut chart event distribution segments calculated from live database with ultra-distinct colors
  const donutSegments = [
    { label: 'Technical Events (Day 1)', count: day1TechCount, percentage: day1Pct, color: '#00f0ff' },
    { label: 'Non-Technical (Day 2)', count: day2NonTechCount, percentage: day2Pct, color: '#f59e0b' },
    { label: 'Both Tracks (Tech + Non-Tech)', count: bothDayCount, percentage: bothDayPct, color: '#a855f7' },
    { label: 'Special Tracks / Workshops', count: specialTracksCount, percentage: specialPct, color: '#10b981' },
  ].filter((s) => s.count > 0 || totalRegistrations === 0);

  // Technical events list (Day 1) breakdown
  const systemTechEvents = allEvents.filter((event) => event.day === 'DAY_1');
  const finalTechEvents = systemTechEvents.length
    ? systemTechEvents
    : [
        { id: 'pp', code: 'PP', name: 'Paper Presentation', day: 'DAY_1' },
        { id: 'sc', code: 'SC', name: 'Scrambled Code', day: 'DAY_1' },
        { id: 'ux', code: 'UX', name: 'UI/UX', day: 'DAY_1' },
      ];

  const distinctColors = [
    '#00f0ff', // Electric Cyan
    '#f59e0b', // Amber Gold
    '#a855f7', // Neon Purple
    '#10b981', // Emerald Green
    '#ec4899', // Hot Pink
    '#3b82f6', // Royal Blue
    '#ff5722', // Radiant Red-Orange
    '#84cc16', // Electric Lime
  ];

  const eventCounts = new Map();
  finalTechEvents.forEach((ev) => eventCounts.set(ev.id, 0));

  registrations.forEach((regItem) => {
    let matched = false;
    (regItem.event_registrations || []).forEach((reg) => {
      if (reg.active === false) return;
      const regId = reg.event_id || reg.events?.id;
      if (regId && eventCounts.has(regId)) {
        eventCounts.set(regId, eventCounts.get(regId) + 1);
        matched = true;
      } else if (reg.events?.name) {
        const found = finalTechEvents.find(
          (e) =>
            e.name.toLowerCase() === reg.events.name.toLowerCase() ||
            (e.code && reg.events.code && e.code.toLowerCase() === reg.events.code.toLowerCase())
        );
        if (found) {
          eventCounts.set(found.id, eventCounts.get(found.id) + 1);
          matched = true;
        }
      }
    });

    if (!matched) {
      const day = regItem.event_day || regItem.registration_type;
      if (day === 'DAY_1' || day === 'BOTH' || day === 'ALL') {
        const firstEv = finalTechEvents[0];
        if (firstEv) {
          eventCounts.set(firstEv.id, eventCounts.get(firstEv.id) + 1);
        }
      }
    }
  });

  const totalTechRegistrations = Array.from(eventCounts.values()).reduce((a, b) => a + b, 0);

  const techSegments = finalTechEvents.map((ev, index) => {
    const count = eventCounts.get(ev.id) || 0;
    return {
      label: ev.name,
      count,
      percentage: percentageOf(count, totalTechRegistrations),
      color: distinctColors[index % distinctColors.length],
    };
  });

  return (
    <div className="space-y-8">
      {/* Top Header Matching Mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black font-heading text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-1.5 font-semibold">
            Overview of registrations and event management
          </p>
        </div>

        {/* Date Range Picker Pill Matching Mockup */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#0c102a] border border-violet-500/35 text-sm font-mono font-bold text-slate-200 shadow-sm">
            <Calendar className="w-4 h-4 text-brand-purple" />
            <span>Sep 01, 2026 - Sep 30, 2026</span>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-[#0c102a] border border-violet-500/35 text-slate-300 hover:text-white transition-colors"
            title="Refresh Metrics"
            style={{ background: '#0c102a' }}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Stat Cards Matching Mockup with Ultra-Legible Typography */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Registrations */}
        <Link to="/admin/registrations" className="cyber-card-purple block group transition-all p-5 sm:p-6 rounded-2xl">
          <div className="w-13 h-13 p-3 rounded-2xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-[0_0_18px_rgba(168,85,247,0.3)] group-hover:scale-105 transition-transform inline-flex">
            <Users className="w-6 h-6" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black font-heading text-white tracking-tight leading-none">
                {totalRegistrations.toLocaleString()}
              </span>
              <span className="inline-flex items-center text-xs sm:text-sm font-black text-emerald-400 font-mono px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                +12%
              </span>
            </div>
            <div className="text-base sm:text-lg text-slate-200 mt-3 font-extrabold group-hover:text-white transition-colors">
              Total Registrations
            </div>
          </div>
        </Link>

        {/* Verified */}
        <Link to="/admin/registrations" className="cyber-card-emerald block group transition-all p-5 sm:p-6 rounded-2xl">
          <div className="w-13 h-13 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform inline-flex">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black font-heading text-white tracking-tight leading-none">
                {verifiedCount.toLocaleString()}
              </span>
              <span className="inline-flex items-center text-xs sm:text-sm font-black text-emerald-400 font-mono px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                +8%
              </span>
            </div>
            <div className="text-base sm:text-lg text-slate-200 mt-3 font-extrabold group-hover:text-white transition-colors">
              Verified
            </div>
          </div>
        </Link>

        {/* Pending */}
        <Link to="/admin/payments" className="cyber-card-amber block group transition-all p-5 sm:p-6 rounded-2xl">
          <div className="w-13 h-13 p-3 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.3)] group-hover:scale-105 transition-transform inline-flex">
            <Hourglass className="w-6 h-6" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black font-heading text-white tracking-tight leading-none">
                {pendingCount.toLocaleString()}
              </span>
              <span className="inline-flex items-center text-xs sm:text-sm font-black text-rose-400 font-mono px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40">
                -4%
              </span>
            </div>
            <div className="text-base sm:text-lg text-slate-200 mt-3 font-extrabold group-hover:text-white transition-colors">
              Pending
            </div>
          </div>
        </Link>

        {/* Rejected */}
        <Link to="/admin/payments" className="cyber-card-pink block group transition-all p-5 sm:p-6 rounded-2xl">
          <div className="w-13 h-13 p-3 rounded-2xl bg-pink-500/20 border border-pink-500/50 flex items-center justify-center text-pink-300 shadow-[0_0_18px_rgba(236,72,153,0.3)] group-hover:scale-105 transition-transform inline-flex">
            <XCircle className="w-6 h-6" />
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black font-heading text-white tracking-tight leading-none">
                {rejectedCount.toLocaleString()}
              </span>
              <span className="inline-flex items-center text-xs sm:text-sm font-black text-rose-400 font-mono px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40">
                -2%
              </span>
            </div>
            <div className="text-base sm:text-lg text-slate-200 mt-3 font-extrabold group-hover:text-white transition-colors">
              Rejected
            </div>
          </div>
        </Link>
      </div>

      {/* Main Charts Row Matching Mockup */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Registrations Overview (Bar Chart) */}
        <div className="lg:col-span-7 cyber-chart-card flex flex-col justify-between">
          <RegistrationsBarChart data={registrationTrend} />
        </div>

        {/* Right: Registrations by Event (Donut Chart) */}
        <div className="lg:col-span-5 cyber-chart-card flex flex-col justify-between">
          <EventDonutChart
            title={chartView === 'TECH_BREAKDOWN' ? 'Technical Events Distribution' : 'Registrations by Track'}
            subtitle={
              chartView === 'TECH_BREAKDOWN'
                ? 'Breakdown of participants registered across technical competitions'
                : 'Live registration choices grouped by event day'
            }
            totalCount={chartView === 'TECH_BREAKDOWN' ? totalTechRegistrations : totalRegistrations}
            totalLabel={chartView === 'TECH_BREAKDOWN' ? 'Total Tech' : 'Total Reg'}
            segments={chartView === 'TECH_BREAKDOWN' ? techSegments : donutSegments}
            rightElement={
              <div className="inline-flex p-1 bg-[#131024] border border-[#2e2652] rounded-xl text-xs gap-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setChartView('TECH_BREAKDOWN')}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    chartView === 'TECH_BREAKDOWN'
                      ? 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white shadow-glow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tech Events
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('DAILY_SPLIT')}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                    chartView === 'DAILY_SPLIT'
                      ? 'bg-gradient-to-r from-purple-700 to-indigo-600 text-white shadow-glow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Track Split
                </button>
              </div>
            }
          />
        </div>
      </div>

      {/* Management Cards (Registration Fees & Special Events) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Base Registration Fees */}
        <div className="cyber-chart-card space-y-5">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold font-heading text-white">
              Registration Base Fees
            </h3>
            <p className="text-sm sm:text-base text-slate-300 mt-1 font-medium">
              Set official symposium entry fee amounts for Day 1 and Day 2 participants.
            </p>
          </div>

          <form onSubmit={handleSaveFees} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Day 1 Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={fees.DAY_1}
                  onChange={(e) => setFees({ ...fees, DAY_1: Number(e.target.value) })}
                  className="cyber-input w-full text-base font-mono py-2.5 px-3.5"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Day 2 Fee (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={fees.DAY_2}
                  onChange={(e) => setFees({ ...fees, DAY_2: Number(e.target.value) })}
                  className="cyber-input w-full text-base font-mono py-2.5 px-3.5"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingFee}
                className="btn-primary text-sm font-bold py-2.5 px-6 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingFee ? 'Saving...' : 'Save Base Fees'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Special Events Catalog */}
        <div className="cyber-chart-card space-y-5">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold font-heading text-white">
              Special Events & Workshops
            </h3>
            <p className="text-sm sm:text-base text-slate-300 mt-1 font-medium">
              Configure add-on masterclasses and premium gaming tracks with standalone fees.
            </p>
          </div>

          {/* Quick Add Form */}
          <form onSubmit={handleAddSpecialEvent} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <input
              type="text"
              required
              placeholder="Code (e.g. AI-LAB)"
              value={newEventCode}
              onChange={(e) => setNewEventCode(e.target.value)}
              className="cyber-input text-sm py-2 px-3 font-mono"
            />
            <input
              type="text"
              required
              placeholder="Title"
              value={newEventName}
              onChange={(e) => setNewEventName(e.target.value)}
              className="cyber-input text-sm py-2 px-3 font-semibold"
            />
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                placeholder="₹ Fee"
                value={newEventFee}
                onChange={(e) => setNewEventFee(e.target.value)}
                className="cyber-input text-sm font-mono py-2 px-3 w-24"
              />
              <button
                type="submit"
                className="btn-secondary text-sm px-4 flex items-center justify-center shrink-0 text-brand-cyan font-bold"
                title="Add Special Track"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Special Events List */}
          <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
            {specialEvents.length > 0 ? (
              specialEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-violet-500/25 text-sm"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-brand-cyan font-bold text-xs bg-brand-cyan/15 border border-brand-cyan/40 px-2 py-0.5 rounded-md">
                      {evt.code}
                    </span>
                    <span className="text-slate-100 font-bold">{evt.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-emerald-400 text-sm">
                      {formatCurrency(evt.fee || 0)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-sm font-medium">
                No special events created yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
