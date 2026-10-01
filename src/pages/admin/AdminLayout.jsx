import React, { useState, useEffect } from 'react';
import { Link, NavLink, Outlet, useNavigate, Navigate } from 'react-router-dom';
import '../../components/common/Sidebar.css';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  ShieldCheck,
  Calendar,
  QrCode,
  Users2,
  Megaphone,
  Settings,
  LogOut,
  Clock,
  Menu,
  X,
  FileSpreadsheet,
  Utensils,
  UserCog,
} from 'lucide-react';

export default function AdminLayout() {
  const { adminProfile, adminSession, isAdminLoading, adminLogout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-[#060814] flex items-center justify-center text-brand-cyan font-heading text-lg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin"></div>
          <span>Authenticating CyberSentinel Admin...</span>
        </div>
      </div>
    );
  }

  if (!adminSession || !adminProfile || adminProfile.role !== 'ADMIN') {
    return <Navigate to="/admin/login" replace />;
  }

  async function handleLogout() {
    await adminLogout();
    navigate('/admin/login');
  }

  // Exact 10 items: 9 navigation items + 1 logout item
  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/registrations', label: 'Registrations', icon: ClipboardList },
    { to: '/admin/participants', label: 'Participants', icon: Users },
    { to: '/admin/payments', label: 'Verification', icon: ShieldCheck },
    { to: '/admin/events', label: 'Events', icon: Calendar },
    { to: '/admin/main-attendance', label: 'QR Codes', icon: QrCode },
    { to: '/admin/teams', label: 'Teams', icon: Users2 },
    { to: '/admin/coordinators', label: 'Coordinators', icon: UserCog },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#060814] flex text-slate-100 font-sans">
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Fixed Vertical Navigation Sidebar (260px) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-[260px] cs-sidebar backdrop-blur-2xl flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand Area */}
        <div className="h-[72px] px-5 border-b border-white/[0.08] flex items-center justify-between relative bg-black/20">
          {/* Subtle cyber corner accents */}
          <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-[#00f0ff]/40"></div>
          <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-[#a855f7]/30"></div>

          <Link to="/admin/dashboard" className="flex items-center gap-3 group">
            {/* Compact futuristic logo container */}
            <div className="relative flex items-center justify-center">
              <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#00f0ff]/20 via-[#a855f7]/20 to-black/60 p-[1px] border border-[#00f0ff]/40 shadow-[0_0_12px_rgba(0,240,255,0.25)] flex items-center justify-center overflow-hidden">
                <img
                  src="/assets/cybersentinel_crest_logo.jpg"
                  alt="Cyber Sentinel 2K26"
                  className="w-full h-full object-cover rounded-[9px]"
                />
              </div>
              {/* Subtle status dot */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00f0ff] border-2 border-[#070919] shadow-[0_0_6px_#00f0ff]"></span>
            </div>

            <div className="flex flex-col">
              <span className="font-heading font-black text-sm tracking-[0.14em] text-white uppercase leading-tight group-hover:text-cyan-200 transition-colors">
                CYBERSENTINEL
              </span>
              <span className="font-mono text-[11px] font-extrabold tracking-[0.22em] text-[#00f0ff] uppercase leading-tight">
                2K26
              </span>
            </div>
          </Link>

          {/* Mobile Close Button */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items (44px height, 14px padding, 9px radius) */}
        <div className="flex-1 px-3.5 py-4 space-y-1.5 overflow-y-auto cs-sidebar-pattern">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `cs-sidebar-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon className="cs-nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Pinned Bottom Area: 10. Logout */}
        <div className="p-3.5 border-t border-white/[0.08] mt-auto relative bg-black/15">
          {/* Subtle separator trace */}
          <div className="absolute top-0 left-4 right-4 h-[1px] bg-gradient-to-r from-transparent via-[#00f0ff]/25 to-transparent"></div>

          <button
            id="admin-sidebar-logout-btn"
            onClick={handleLogout}
            className="cs-sidebar-nav-item w-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 group"
          >
            <LogOut className="cs-nav-icon text-slate-400 group-hover:text-rose-400 transition-colors" />
            <span className="font-medium text-[13.5px] tracking-wide">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area (begins strictly after the 260px sidebar) */}
      <div className="flex-1 lg:ml-[260px] flex flex-col min-w-0 w-full lg:w-[calc(100vw-260px)]">
        {/* Top Header */}
        <header className="h-[72px] px-6 sm:px-8 border-b border-white/[0.08] bg-[#070919]/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-30">
          {/* Mobile hamburger & Command Node Live Indicator */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white bg-white/5 border border-white/10 hover:border-cyan-500/40 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Cyber Sentinel Command Node Indicator */}
            <div className="flex items-center gap-2.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-cyan-500/35 bg-cyan-950/40 text-cyan-300 font-mono text-xs sm:text-sm font-bold tracking-wider shadow-[0_0_15px_rgba(0,240,255,0.12)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f0ff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f0ff]"></span>
              </span>
              <span className="hidden sm:inline text-white font-extrabold">CYBERSENTINEL //</span>
              <span className="text-[#00f0ff] font-black">ADMIN COMMAND ACTIVE</span>
            </div>
          </div>

          {/* Right Live Telemetry & Secure Sync Status */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Realtime Supabase Sync Status */}
            <div className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-emerald-500/35 bg-emerald-950/40 text-emerald-400 font-mono text-xs sm:text-sm font-bold tracking-wide shadow-[0_0_14px_rgba(16,185,129,0.18)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="hidden sm:inline">LIVE SYNC ACTIVE</span>
              <span className="sm:hidden">SYNC ACTIVE</span>
            </div>

            {/* Live Digital Clock */}
            <div className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border border-violet-500/30 bg-[#0c0f24] text-slate-200 font-mono text-xs sm:text-sm font-bold tracking-wider shadow-sm">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span>{currentTime}</span>
            </div>

            {/* Security Status Shield */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl border border-purple-500/30 bg-purple-950/40 text-purple-300 font-mono text-xs sm:text-sm font-bold tracking-wider">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>SECURE ROOT</span>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
