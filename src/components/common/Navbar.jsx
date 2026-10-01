import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Shield,
  Users,
  Menu,
  X,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full pt-3 sm:pt-4 pb-2">
      {/* Standalone Separate Elements Across Top Row (Unboxed) */}
      <div className="portal-container flex items-center justify-between gap-3 sm:gap-4">
        {/* Left: Brand Badge (Separate Floating Glass Island) */}
        <Link
          to="/"
          className="flex items-center gap-3 px-3.5 py-2 rounded-2xl group transition-all duration-200"
          style={{
            background: 'rgba(7, 12, 28, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1.5px solid rgba(0, 240, 255, 0.32)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7), 0 0 16px rgba(0, 240, 255, 0.12)',
            textDecoration: 'none',
          }}
        >
          <div className="relative flex-shrink-0">
            {/* Hexagonal / Chamfered Cyber Aperture for Crest */}
            <div
              className="w-10 h-10 p-[2px] rounded-xl flex items-center justify-center relative overflow-hidden transition-transform duration-200 group-hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #00f0ff 0%, #a855f7 50%, #ec4899 100%)',
                boxShadow: '0 0 16px rgba(0, 240, 255, 0.65)',
              }}
            >
              <img
                src="/assets/cybersentinel_crest_logo.jpg"
                alt="Cyber Sentinel Logo"
                className="w-full h-full object-cover rounded-[9px]"
              />
            </div>
            {/* Live radar status node */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#060a1a]"
              style={{ animation: 'cyberRadarPulseEmerald 2.5s infinite' }}
              title="Sentinel Core Active"
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span
                style={{
                  fontFamily: 'var(--font-cyber)',
                  fontSize: '18px',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  color: '#00f0ff',
                  textShadow: '0 0 14px rgba(0, 240, 255, 0.85)',
                }}
              >
                CYBER
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-cyber)',
                  fontSize: '18px',
                  fontWeight: 900,
                  letterSpacing: '0.08em',
                  color: '#ffffff',
                }}
              >
                SENTINEL
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  letterSpacing: '0.28em',
                  color: '#c084fc',
                  textTransform: 'uppercase',
                }}
              >
                SYMPOSIUM 2K26
              </span>
            </div>
          </div>
        </Link>

        {/* Center: Navigation Links (Separate Floating Command Deck Dock) */}
        <nav
          className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-2xl"
          style={{
            background: 'rgba(7, 12, 28, 0.85)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1.5px solid rgba(0, 240, 255, 0.28)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.75), 0 0 20px rgba(0, 240, 255, 0.1)',
          }}
        >
          {/* 01: Portal Hub */}
          <Link
            to="/"
            className={`cyber-nav-tab ${isActive('/') ? 'active' : ''}`}
          >
            <span className="text-[10px] font-mono text-cyan-400/70 font-semibold tracking-wider">01</span>
            <Home className="w-4 h-4 text-cyan-400" />
            <span>Portal Hub</span>
          </Link>

          {/* 02: Register */}
          <Link
            to="/register"
            className={`cyber-nav-tab ${isActive('/register') ? 'active' : ''}`}
          >
            <span className="text-[10px] font-mono text-cyan-400/70 font-semibold tracking-wider">02</span>
            <span>Register</span>
          </Link>

          {/* 03: Check Pass */}
          <Link
            to="/check"
            className={`cyber-nav-tab ${isActive('/check') ? 'active' : ''}`}
          >
            <span className="text-[10px] font-mono text-cyan-400/70 font-semibold tracking-wider">03</span>
            <span>Check Pass</span>
          </Link>

          {/* 04: Teams */}
          <Link
            to="/team/create"
            className={`cyber-nav-tab ${isActive('/team/create') ? 'active' : ''}`}
          >
            <span className="text-[10px] font-mono text-cyan-400/70 font-semibold tracking-wider">04</span>
            <span>Teams</span>
          </Link>

          {/* 05: Events */}
          <a
            href="#events-grid"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('events-grid');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="cyber-nav-tab"
          >
            <span className="text-[10px] font-mono text-cyan-400/70 font-semibold tracking-wider">05</span>
            <span>Events</span>
          </a>

          {/* 06: Contact */}
          <a
            href="mailto:support@cybersentinel.in"
            className="cyber-nav-tab"
          >
            <span className="text-[10px] font-mono text-cyan-400/70 font-semibold tracking-wider">06</span>
            <span>Contact</span>
          </a>
        </nav>

        {/* Right: Separate Action Buttons (Standalone Islands) */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Admin Terminal Button */}
          <Link
            to="/admin/login"
            className="cyber-btn-chamfer flex items-center gap-2 px-4 py-2 text-sm font-semibold tracking-wide text-slate-200"
            style={{
              background: 'rgba(12, 17, 36, 0.90)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1.5px solid rgba(168, 85, 247, 0.45)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6), 0 0 14px rgba(168, 85, 247, 0.25)',
              textDecoration: 'none',
            }}
          >
            <Shield className="w-4 h-4 text-violet-400" />
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Admin</span>
          </Link>

          {/* Coordinator Action Button */}
          <Link
            to="/coordinator/login"
            className="cyber-btn-chamfer flex items-center gap-2 px-5 py-2 text-sm font-extrabold tracking-wide text-[#030917]"
            style={{
              background: 'linear-gradient(135deg, #00f0ff 0%, #38bdf8 50%, #00b4d8 100%)',
              border: '1.5px solid #38bdf8',
              boxShadow: '0 0 24px rgba(0, 240, 255, 0.75)',
              textDecoration: 'none',
            }}
          >
            <Users className="w-4 h-4 text-[#030917]" />
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                letterSpacing: '0.04em',
              }}
            >
              Coordinator
            </span>
          </Link>
        </div>

        {/* Mobile Hamburger Button (Standalone) */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:text-white"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="portal-container mt-3">
          <div
            className="lg:hidden p-4 rounded-xl backdrop-blur-2xl flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2"
            style={{
              background: 'rgba(8, 12, 32, 0.98)',
              border: '1.5px solid rgba(0, 240, 255, 0.35)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.9)',
            }}
          >
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-sm font-bold text-white bg-cyan-950/40 border border-cyan-500/40"
            >
              <Home className="w-4 h-4 text-[#00f0ff]" />
              <span>01 // Portal Hub</span>
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg"
            >
              02 // Participant Registration
            </Link>
            <Link
              to="/check"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg"
            >
              03 // Check Pass & Status
            </Link>
            <Link
              to="/team/create"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg"
            >
              04 // Create Team Package
            </Link>
            <Link
              to="/team/join"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3.5 py-2 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-lg"
            >
              Join Friend's Team
            </Link>
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-cyan-500/20">
              <Link
                to="/admin/login"
                onClick={() => setMobileMenuOpen(false)}
                className="cyber-btn-chamfer flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold text-white bg-violet-950/50 border border-violet-500/40"
              >
                <Shield className="w-3.5 h-3.5 text-violet-300" />
                <span>Admin</span>
              </Link>
              <Link
                to="/coordinator/login"
                onClick={() => setMobileMenuOpen(false)}
                className="cyber-btn-chamfer flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-extrabold text-[#030917] bg-gradient-to-r from-[#00f0ff] to-[#38bdf8]"
              >
                <Users className="w-3.5 h-3.5 text-[#030917]" />
                <span>Coordinator</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
