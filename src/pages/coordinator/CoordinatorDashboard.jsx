import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CoordinatorDashboard.css';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import useCoordinatorAssignedEvents from '../../hooks/useCoordinatorAssignedEvents';
import { getCoordinatorParticipants } from '../../services/coordinatorService';
import { subscribeToRealtimeUpdates } from '../../utils/statusStore';
import RegistrationsBarChart from '../../components/charts/RegistrationsBarChart';
import EventDonutChart from '../../components/charts/EventDonutChart';
import {
  buildRegistrationTrend,
  getRegistrationStatusCounts,
  getTrackCounts,
  percentageOf,
} from '../../utils/dashboardMetrics';
import {
  Users,
  CheckCircle2,
  Hourglass,
  XCircle,
  Calendar,
  Layers,
  ArrowRight,
  RefreshCw,
  QrCode,
  MapPin,
  Crosshair,
} from 'lucide-react';

export default function CoordinatorDashboard() {
  const { user, coordinatorProfile, getCoordinatorClientInstance } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allDbEvents, setAllDbEvents] = useState([]);
  const [participants, setParticipants] = useState([]);

  const client = getCoordinatorClientInstance();
  const coordId = coordinatorProfile?.id || user?.id || null;

  // Assigned event context is shared with the command-deck header
  const {
    normalEvents: assignedEvents,
    specialEvents: assignedSpecialEvents,
    primaryEventName,
    eventsLoading,
    refreshEvents,
  } = useCoordinatorAssignedEvents(client, coordId);

  const loadData = async () => {
    try {
      setRefreshing(true);

      // Also fetch all system events to give full technical event breakdown
      try {
        const { data: dbEvts } = await client.from('events').select('id, code, name, day, event_type');
        if (dbEvts && dbEvts.length > 0) {
          setAllDbEvents(dbEvts);
        }
      } catch (evtErr) {
        console.warn('Could not load global events list:', evtErr);
      }

      const { normalEvents, specialEvents } = await refreshEvents();
      const partList = await getCoordinatorParticipants(client, normalEvents, specialEvents);

      setParticipants(partList || []);
    } catch (err) {
      console.error('Could not load coordinator dashboard:', err);
      setParticipants([]);
      addToast(err.message || 'Could not load coordinator dashboard data.', 'error');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [chartView, setChartView] = useState('TECH_BREAKDOWN'); // TECH_BREAKDOWN or DAILY_SPLIT

  // Every coordinator metric is derived from live database participants
  const statusCounts = getRegistrationStatusCounts(participants);
  const trackCounts = getTrackCounts(participants);
  const totalCount = statusCounts.total;
  const verifiedCount = statusCounts.verified;
  const pendingCount = statusCounts.pending;
  const rejectedCount = statusCounts.rejected;

  // Technical events list (Day 1)
  const systemTechEvents = (allDbEvents.length ? allDbEvents : assignedEvents).filter(
    (event) => event.day === 'DAY_1'
  );
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

  participants.forEach((participant) => {
    let matched = false;

    // 1. Check explicit event_registrations array
    (participant.event_registrations || []).forEach((reg) => {
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

    // 2. Check participant.events string array or participant.event_name
    if (!matched) {
      const pEventList = Array.isArray(participant.events)
        ? participant.events
        : [participant.event_name];
      for (const evName of pEventList) {
        if (!evName) continue;
        const found = finalTechEvents.find(
          (e) =>
            e.name.toLowerCase() === evName.toLowerCase() ||
            (e.code && e.code.toLowerCase() === evName.toLowerCase())
        );
        if (found) {
          eventCounts.set(found.id, eventCounts.get(found.id) + 1);
          matched = true;
          break;
        }
      }
    }

    // 3. Fallback: If registered for DAY_1 or BOTH and assigned to this coordinator
    if (!matched && (participant.selected_day === 'DAY_1' || participant.selected_day === 'BOTH')) {
      const assignedTech = assignedEvents.find((e) => e.day === 'DAY_1');
      const targetId = assignedTech ? assignedTech.id : finalTechEvents[0]?.id;
      if (targetId && eventCounts.has(targetId)) {
        eventCounts.set(targetId, eventCounts.get(targetId) + 1);
      }
    }
  });

  const technicalEventCounts = finalTechEvents.map((event) => ({
    event,
    count: eventCounts.get(event.id) || 0,
  }));
  const overallTechCount = technicalEventCounts.reduce((total, item) => total + item.count, 0);

  const techSegments = technicalEventCounts
    .map((item, index) => ({
      label: item.event.name,
      count: item.count,
      percentage: percentageOf(item.count, overallTechCount),
      color: distinctColors[index % distinctColors.length],
    }))
    .filter((s) => s.count > 0 || overallTechCount === 0);

  // The alternative view counts distinct registrations by day track with ultra-distinct colors
  const dailySegments = [
    { label: 'Technical (Day 1)', count: trackCounts.day1, percentage: percentageOf(trackCounts.day1, totalCount), color: '#00f0ff' },
    { label: 'Non-Technical (Day 2)', count: trackCounts.day2, percentage: percentageOf(trackCounts.day2, totalCount), color: '#f59e0b' },
    { label: 'Both Days', count: trackCounts.both, percentage: percentageOf(trackCounts.both, totalCount), color: '#a855f7' },
    { label: 'Special Tracks', count: trackCounts.special, percentage: percentageOf(trackCounts.special, totalCount), color: '#10b981' },
  ].filter((s) => s.count > 0 || totalCount === 0);
  const registrationTrend = buildRegistrationTrend(participants);

  return (
    <div className="space-y-8">
      {/* Page Header: title + coordinator event scope (left), date + refresh (right) */}
      <div className="cs-page-head">
        <div>
          <h1 className="cs-page-title">Dashboard</h1>
          <p className="cs-page-subtitle">Overview of registrations and event management</p>

          {primaryEventName && (
            <span className="cs-page-scope">
              <Crosshair className="w-3.5 h-3.5" />
              <span>Scope: {primaryEventName}</span>
            </span>
          )}
        </div>

        {/* Date Range Picker Pill + Refresh */}
        <div className="flex items-center gap-2.5">
          <div className="cs-date-pill">
            <Calendar className="w-4 h-4 text-brand-purple" />
            <span>Sep 01, 2026 - Sep 30, 2026</span>
          </div>

          <button onClick={loadData} disabled={refreshing} className="cs-icon-button" title="Refresh Metrics">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Stat Cards — equal width, equal height, shared grid boundaries */}
      <div className="cs-stat-grid">
        {/* Total Registrations */}
        <Link to="/coordinator/participants" className="cyber-card-purple cs-stat-card group">
          <div className="cs-stat-icon is-purple">
            <Users className="w-6 h-6" />
          </div>
          <div style={{ marginTop: '18px' }}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="cs-stat-value">{totalCount.toLocaleString()}</span>
              <span className="cs-stat-delta is-up">
                +12%
              </span>
            </div>
            <div className="cs-stat-label">Total Registrations</div>
          </div>
        </Link>

        {/* Verified */}
        <Link to="/coordinator/participants" className="cyber-card-emerald cs-stat-card group">
          <div className="cs-stat-icon is-emerald">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div style={{ marginTop: '18px' }}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="cs-stat-value">{verifiedCount.toLocaleString()}</span>
              <span className="cs-stat-delta is-up">
                +8%
              </span>
            </div>
            <div className="cs-stat-label">Verified</div>
          </div>
        </Link>

        {/* Pending */}
        <Link to="/coordinator/payments" className="cyber-card-amber cs-stat-card group">
          <div className="cs-stat-icon is-amber">
            <Hourglass className="w-6 h-6" />
          </div>
          <div style={{ marginTop: '18px' }}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="cs-stat-value">{pendingCount.toLocaleString()}</span>
              <span className="cs-stat-delta is-down">
                -4%
              </span>
            </div>
            <div className="cs-stat-label">Pending</div>
          </div>
        </Link>

        {/* Rejected */}
        <Link to="/coordinator/payments" className="cyber-card-pink cs-stat-card group">
          <div className="cs-stat-icon is-pink">
            <XCircle className="w-6 h-6" />
          </div>
          <div style={{ marginTop: '18px' }}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="cs-stat-value">{rejectedCount.toLocaleString()}</span>
              <span className="cs-stat-delta is-down">
                -2%
              </span>
            </div>
            <div className="cs-stat-label">Rejected</div>
          </div>
        </Link>
      </div>

      {/* Main Charts Row aligned to the same grid as the stat cards */}
      <div className="cs-chart-grid">
        {/* Left: Registrations Overview Bar Chart */}
        <div className="cs-span-7 cyber-chart-card flex flex-col justify-between">
          <RegistrationsBarChart data={registrationTrend} />
        </div>

        {/* Right: Registrations by Event Donut Chart with View Toggle */}
        <div className="cs-span-5 cyber-chart-card flex flex-col justify-between">
          <EventDonutChart
            title={chartView === 'TECH_BREAKDOWN' ? 'Your Technical Events' : 'Your Track Distribution'}
            subtitle={
              chartView === 'TECH_BREAKDOWN'
                ? `${overallTechCount} live event registrations${
                    primaryEventName ? ` for ${primaryEventName}` : ' across your assigned technical events'
                  }`
                : 'Live registrations in your assigned coordinator scope'
            }
            totalCount={chartView === 'TECH_BREAKDOWN' ? overallTechCount : totalCount}
            totalLabel={chartView === 'TECH_BREAKDOWN' ? 'Total Tech' : 'Total Reg'}
            segments={chartView === 'TECH_BREAKDOWN' ? techSegments : dailySegments}
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
                  Daily Split
                </button>
              </div>
            }
          />
        </div>
      </div>

      {/* Assigned Events Roster Cards */}
      <div className="cyber-chart-card space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl sm:text-2xl font-black font-heading text-white flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-brand-cyan" />
              Your Assigned Event Responsibilities
            </h3>
            <p className="text-sm sm:text-base text-slate-300 mt-1 font-medium">
              {primaryEventName
                ? `Verification and attendance authority for ${primaryEventName}.`
                : 'Event tracks where your coordinator credentials have verification and attendance authority.'}
            </p>
          </div>

          <Link
            to="/coordinator/attendance"
            className="btn-primary text-sm font-bold py-2.5 px-5 flex items-center gap-2 self-start sm:self-auto"
          >
            <QrCode className="w-4 h-4" />
            <span>Open Event Scanner</span>
          </Link>
        </div>

        {loading || eventsLoading ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-brand-cyan" />
            <span className="text-sm font-medium">Loading assigned tracks...</span>
          </div>
        ) : assignedEvents.length === 0 && assignedSpecialEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm font-medium">
            No events are currently assigned to your coordinator profile. Please contact an administrator.
          </div>
        ) : (
          <div className="cs-roster-grid">
            {assignedEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-5 rounded-2xl bg-white/[0.03] border border-violet-500/25 hover:border-brand-cyan/50 transition-all space-y-3.5 shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="badge-outline text-xs text-brand-cyan border-brand-cyan/40 font-mono font-bold px-2 py-0.5">
                      {evt.code}
                    </span>
                    <h4 className="text-base sm:text-lg font-bold text-white mt-1.5">
                      {evt.name}
                    </h4>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-300 font-mono">
                    {evt.day}
                  </span>
                </div>

                <div className="text-sm text-slate-300 space-y-1.5 font-medium">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>Venue: {evt.venue || 'Main Auditorium'}</span>
                  </div>
                  <div>
                    Track Type: <span className="text-white capitalize font-semibold">{evt.event_type?.toLowerCase() || 'Technical'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-violet-500/20 flex items-center justify-between text-sm font-bold">
                  <Link
                    to="/coordinator/participants"
                    className="text-brand-cyan hover:underline flex items-center gap-1.5"
                  >
                    <span>View Roster</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to="/coordinator/attendance"
                    className="text-brand-purple hover:underline flex items-center gap-1.5"
                  >
                    <span>Scan In</span>
                  </Link>
                </div>
              </div>
            ))}

            {assignedSpecialEvents.map((sp) => (
              <div
                key={sp.id}
                className="p-4 rounded-xl bg-brand-purple/[0.04] border border-brand-purple/20 hover:border-brand-purple/40 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="badge-outline text-[10px] text-brand-purple border-brand-purple/30 font-mono">
                      [Special] {sp.code}
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">
                      {sp.name}
                    </h4>
                  </div>
                </div>

                <div className="text-xs text-slate-400">
                  Fee: <span className="font-mono text-emerald-400 font-semibold">₹{sp.fee || 0}</span>
                </div>

                <div className="pt-2 border-t border-violet-500/20 flex items-center justify-between text-xs">
                  <Link
                    to="/coordinator/participants"
                    className="text-brand-cyan hover:underline flex items-center gap-1"
                  >
                    <span>View Roster</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
