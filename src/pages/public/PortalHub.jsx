import React from 'react';
import { Link } from 'react-router-dom';
import './PortalHub.css';
import { Navbar } from '../../components/common/Navbar';
import {
  FilePlus,
  QrCode,
  Users2,
  CalendarCheck,
  ShieldCheck,
  UserCog,
  ArrowRight,
  Cpu,
  Sparkles,
} from 'lucide-react';

export default function PortalHub() {
  const cards = [
    {
      num: '01',
      tag: 'PUBLIC ENTRY',
      title: 'Participant Registration',
      description: 'Submit participant details, select event categories, and upload payment proof.',
      link: '/register',
      icon: FilePlus,
      color: '#00f0ff',
      glow: 'rgba(0, 240, 255, 0.45)',
      cardBg: 'linear-gradient(155deg, rgba(8, 22, 46, 0.90) 0%, rgba(4, 11, 28, 0.95) 100%)',
      borderColor: '#00f0ff',
      btnBorder: '#00f0ff',
      textColor: '#00f0ff',
    },
    {
      num: '02',
      tag: 'PASS GENERATION',
      title: 'Check Registration & QR Pass',
      description: 'Search participant details, verify payment status, and download official QR passes.',
      link: '/check',
      icon: QrCode,
      color: '#00e5c9',
      glow: 'rgba(0, 229, 201, 0.45)',
      cardBg: 'linear-gradient(155deg, rgba(5, 30, 38, 0.90) 0%, rgba(3, 15, 24, 0.95) 100%)',
      borderColor: '#00e5c9',
      btnBorder: '#00e5c9',
      textColor: '#00e5c9',
    },
    {
      num: '03',
      tag: 'TEAM MANAGEMENT',
      title: 'Create Team Package',
      description: 'Create event packages, verify team members, and generate official team codes.',
      link: '/team/create',
      icon: Users2,
      color: '#c084fc',
      glow: 'rgba(192, 132, 252, 0.45)',
      cardBg: 'linear-gradient(155deg, rgba(32, 15, 56, 0.90) 0%, rgba(18, 9, 36, 0.95) 100%)',
      borderColor: '#a855f7',
      btnBorder: '#a855f7',
      textColor: '#c084fc',
    },
    {
      num: '04',
      tag: 'EVENT MANAGEMENT',
      title: 'Event Management',
      description: 'Manage event details, slot limits, registrations, and participant lists.',
      link: '/coordinator/login',
      icon: CalendarCheck,
      color: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.45)',
      cardBg: 'linear-gradient(155deg, rgba(10, 22, 52, 0.90) 0%, rgba(6, 13, 34, 0.95) 100%)',
      borderColor: '#38bdf8',
      btnBorder: '#38bdf8',
      textColor: '#38bdf8',
    },
    {
      num: '05',
      tag: 'ADMIN WORKSPACE',
      title: 'Admin Workspace',
      description: 'Manage registrations, verify payments, operate event records, and control access.',
      link: '/admin/login',
      icon: ShieldCheck,
      color: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.45)',
      cardBg: 'linear-gradient(155deg, rgba(46, 12, 28, 0.90) 0%, rgba(26, 7, 18, 0.95) 100%)',
      borderColor: '#f43f5e',
      btnBorder: '#f43f5e',
      textColor: '#fb7185',
    },
    {
      num: '06',
      tag: 'STAFF & COORDINATORS',
      title: 'Coordinator Workspace',
      description: 'Assign coordinators, manage responsibilities, and monitor participant activity.',
      link: '/coordinator/login',
      icon: UserCog,
      color: '#eab308',
      glow: 'rgba(234, 179, 8, 0.45)',
      cardBg: 'linear-gradient(155deg, rgba(40, 28, 6, 0.90) 0%, rgba(24, 16, 4, 0.95) 100%)',
      borderColor: '#eab308',
      btnBorder: '#eab308',
      textColor: '#facc15',
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full flex flex-col relative text-slate-100 selection:bg-cyan-500/30 selection:text-white overflow-x-hidden">
      {/* Zero-Lag Hardware-Accelerated Background Plate with Exact Reference Artwork */}
      <div className="cyber-fixed-bg" />

      {/* Main Content Area: Proportional & Matching Reference UI */}
      <div className="relative z-10 flex flex-col min-h-screen w-full max-w-full">
        <Navbar />

        <main className="flex-1 w-full max-w-full pt-6 sm:pt-8 pb-16">
          <div className="portal-container">
            {/* Hero Section: Perfectly locked to the left edge of the portal container */}
            <section className="text-left" style={{ margin: '0 0 36px 0', padding: 0 }}>
              {/* Eyebrow */}
              <div className="inline-flex items-center gap-2 mb-3 font-mono text-xs sm:text-sm font-bold tracking-[0.25em] text-[#00f0ff] uppercase drop-shadow-[0_0_10px_rgba(0,240,255,0.7)]">
                <span className="text-[#00f0ff] text-sm leading-none animate-pulse">✦</span>
                <span>WELCOME TO</span>
              </div>

              {/* Massive Bold Headline */}
              <h1 className="tracking-wide leading-[1.08] mb-3 drop-shadow-[0_0_40px_rgba(0,0,0,0.95)] max-w-full">
                <span
                  style={{
                    fontFamily: 'var(--font-cyber)',
                    fontSize: 'clamp(2rem, 7vw, 4.2rem)',
                    fontWeight: 900,
                    color: '#ffffff',
                    letterSpacing: '0.04em',
                    display: 'inline-block',
                    maxWidth: '100%',
                    textShadow: '0 0 25px rgba(0, 240, 255, 0.85), 0 0 50px rgba(0, 240, 255, 0.45)',
                    WebkitTextStroke: '1.2px rgba(0, 240, 255, 0.4)',
                  }}
                >
                  CYBER
                </span>
                <br />
                <span
                  style={{
                    fontFamily: 'var(--font-cyber)',
                    fontSize: 'clamp(1.65rem, 6.2vw, 4rem)',
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                    background: 'linear-gradient(90deg, #f5d0fe 0%, #e879f9 40%, #ec4899 75%, #f43f5e 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 35px rgba(236,72,153,0.75))',
                    WebkitTextStroke: '0.8px rgba(236,72,153,0.35)',
                    display: 'inline-block',
                    maxWidth: '100%',
                    wordBreak: 'break-word',
                  }}
                >
                  SENTINEL 2K26
                </span>
              </h1>

              {/* Subheading / Tagline */}
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1rem, 2.5vw, 1.65rem)',
                  fontWeight: 800,
                  color: '#00f0ff',
                  letterSpacing: '-0.01em',
                  marginTop: '10px',
                  marginBottom: '0px',
                  textShadow: '0 0 18px rgba(0, 240, 255, 0.65)',
                }}
              >
                Register. Verify. Show up ready.
              </h2>
            </section>

            {/* Strict Cards Grid: 2 Columns in a Row on Desktop */}
            <section id="events-grid" className="cards-grid">
              {cards.map((c) => {
                const Icon = c.icon;
                return (
                  <div
                    key={c.num}
                    className="portal-card group"
                    style={{
                      background: c.cardBg,
                      border: `1.5px solid ${c.borderColor}`,
                      boxShadow: `0 0 18px ${c.glow}, inset 0 0 14px ${c.color}10, 0 10px 25px rgba(0, 0, 0, 0.85)`,
                    }}
                  >
                    {/* Top Right Subtle Cyber Accent Line */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: '28px',
                        width: '44px',
                        height: '1.5px',
                        background: c.color,
                        boxShadow: `0 0 8px ${c.color}`,
                      }}
                    />

                    {/* Bottom Right Corner Tech Accent */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '14px',
                        width: '32px',
                        height: '20px',
                        borderBottom: `1.5px solid ${c.color}40`,
                        borderRight: `1.5px solid ${c.color}40`,
                        borderBottomRightRadius: '8px',
                        pointerEvents: 'none',
                      }}
                    />

                    {/* Top Right Watermark Numeral */}
                    <span
                      className="card-numeral"
                      style={{
                        color: c.color,
                        opacity: 0.35,
                        textShadow: `0 0 14px ${c.color}`,
                      }}
                    >
                      {c.num}
                    </span>

                    {/* Left: Node Icon Box (Identical 60px fixed width on every card) */}
                    <div
                      className="card-icon-box group-hover:scale-105"
                      style={{
                        background: `${c.color}15`,
                        border: `1.5px solid ${c.color}`,
                        boxShadow: `0 0 18px ${c.color}35`,
                      }}
                    >
                      <Icon style={{ width: '28px', height: '28px', color: c.color }} />
                    </div>

                    {/* Right: Content Column (Exact same X start coordinate for all items) */}
                    <div className="card-content">
                      <div style={{ width: '100%' }}>
                        {/* Header Row: Tag Pill */}
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 14px',
                              borderRadius: '9999px',
                              fontSize: '11.5px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              background: `${c.color}18`,
                              border: `1.2px solid ${c.color}50`,
                              color: c.textColor,
                            }}
                          >
                            {c.tag}
                          </span>
                        </div>

                        {/* Title */}
                        <h3
                          style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: '1.25rem',
                            fontWeight: 800,
                            color: '#ffffff',
                            letterSpacing: '-0.01em',
                            marginTop: '8px',
                            marginBottom: '6px',
                            lineHeight: 1.25,
                          }}
                        >
                          {c.title}
                        </h3>

                        {/* Description */}
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.92rem',
                            color: '#94a3b8',
                            lineHeight: 1.55,
                            margin: 0,
                          }}
                        >
                          {c.description}
                        </p>
                      </div>

                      {/* Launch Action Button */}
                      <div style={{ marginTop: '18px' }}>
                        <Link
                          to={c.link}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '6px 24px',
                            borderRadius: '9999px',
                            background: `${c.color}15`,
                            border: `1.2px solid ${c.btnBorder}`,
                            color: c.color,
                            fontSize: '13.5px',
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            boxShadow: `0 0 12px ${c.color}30`,
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.filter = 'brightness(1.25)';
                            e.currentTarget.style.transform = 'translateX(2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.filter = 'brightness(1)';
                            e.currentTarget.style.transform = 'translateX(0)';
                          }}
                        >
                          <span>Launch</span>
                          <ArrowRight style={{ width: '14px', height: '14px' }} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export { PortalHub };
