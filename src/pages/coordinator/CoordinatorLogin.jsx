import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { User, Lock, Eye, EyeOff, ArrowRight, Shield } from 'lucide-react';
import '../Auth.css';
import '../admin/AdminLogin.css';

export default function CoordinatorLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { loginCoordinator, coordinatorLogin } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const doLogin = loginCoordinator || coordinatorLogin;
      await doLogin(email, password);
      addToast('Coordinator authenticated! Welcome back.', 'success');
      navigate('/coordinator/dashboard');
    } catch (err) {
      console.error('Coordinator login error:', err);
      let msg = err.message || 'Invalid coordinator credentials';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        msg = 'Enter correct email and passwords';
      }
      addToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cyber-login-container">
      <div className="cyber-login-overlay" />

      {/* Main 2-Column Responsive Layout */}
      <div className="cyber-login-layout">
        {/* Left Side: Brand Hero matching exact uploaded reference */}
        <div className="cyber-login-brand">
          {/* Logo with outer glow - fully inside circle */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div
              style={{
                position: 'absolute',
                inset: '-12px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(0, 240, 255, 0.45) 0%, rgba(168, 85, 247, 0.2) 65%, transparent 100%)',
                filter: 'blur(20px)',
              }}
            />
            <div
              className="cyber-login-crest is-coordinator"
              style={{
                width: '215px',
                height: '215px',
                borderRadius: '50%',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#09071c',
                border: '3px solid #00f0ff',
                boxShadow: '0 0 35px rgba(0, 240, 255, 0.65), inset 0 0 15px rgba(168, 85, 247, 0.3)',
                overflow: 'hidden',
              }}
            >
              <img
                src="/assets/cybersentinel_crest_logo.jpg"
                alt="CyberSentinel 2K26 Emblem"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  padding: '3px',
                  display: 'block',
                }}
              />
            </div>
          </div>

          {/* Titles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxWidth: '100%' }}>
            <h1 className="cyber-login-title">
              COORDINATOR PORTAL
            </h1>
            <p className="cyber-login-subtitle">
              Verify • Supervise • Coordinate
            </p>
          </div>

          {/* Clean Cyber Event Badge (No AI Sparkles) */}
          <div className="cyber-event-badge">
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(0, 240, 255, 0.12)',
                border: '1px solid rgba(0, 240, 255, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00f0ff',
                flexShrink: 0,
              }}
            >
              <Shield size={17} />
            </div>

            <div style={{ textAlign: 'left', minWidth: 0 }}>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#ffffff',
                  letterSpacing: '0.02em',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                CyberSentinel 2K26
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', wordBreak: 'break-word' }}>
                Event Coordinator & Gate Verification Console
              </div>
            </div>
          </div>

          {/* College Sub-caption */}
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.18em',
              color: '#64748b',
              textTransform: 'uppercase',
            }}
          >
            VEL TECH HIGH TECH COLLEGE
          </div>
        </div>

        {/* Right Side: SCI-FI HUD CARD with EXACT Cutout Shape */}
        <div className="cyber-hud-card-col">
          <div className="cyber-hud-card-wrapper">
            {/* SVG Card Cutout Frame with Exact Top-Left Step & Side Notches */}
            <svg
              viewBox="0 0 520 560"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
            >
              <defs>
                <linearGradient id="coordHudStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00f0ff" />
                  <stop offset="35%" stopColor="#818cf8" />
                  <stop offset="65%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <filter id="coordHudNeonGlow" x="-10%" y="-10%" width="120%" height="120%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Exact Cutout Outer Path */}
              <path
                d="
                  M 24 28
                  L 142 28
                  L 166 12
                  L 496 12
                  A 14 14 0 0 1 510 26
                  L 510 135
                  L 516 140
                  L 516 210
                  L 510 215
                  L 510 515
                  L 485 540
                  L 45 540
                  L 12 507
                  L 12 375
                  L 6 370
                  L 6 300
                  L 12 295
                  L 12 40
                  A 12 12 0 0 1 24 28
                  Z
                "
                fill="rgba(12, 10, 32, 0.90)"
                stroke="url(#coordHudStrokeGrad)"
                strokeWidth="2"
                filter="url(#coordHudNeonGlow)"
              />

              {/* Cyan Accent Highlights */}
              <line x1="142" y1="28" x2="166" y2="12" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" />
              <line x1="110" y1="28" x2="142" y2="28" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" />
              <line x1="6" y1="305" x2="6" y2="365" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" />
              <line x1="12" y1="507" x2="45" y2="540" stroke="#00f0ff" strokeWidth="3" strokeLinecap="round" />

              {/* Magenta Accent Highlights */}
              <line x1="516" y1="145" x2="516" y2="205" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
              <line x1="485" y1="540" x2="510" y2="515" stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
            </svg>

            {/* Inner Form Content */}
            <div className="cyber-hud-form-body">
              {/* Header */}
              <div style={{ marginBottom: '28px' }}>
                <h2
                  style={{
                    fontSize: '30px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-heading)',
                    color: '#00f0ff',
                    letterSpacing: '-0.01em',
                    textShadow: '0 0 20px rgba(0, 240, 255, 0.5)',
                  }}
                >
                  Welcome Back
                </h2>
                <p style={{ fontSize: '14px', color: '#cbd5e1', marginTop: '6px' }}>
                  Login to coordinate assigned events & verify attendees
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Coordinator ID / Email */}
                <div style={{ position: 'relative' }}>
                  <User
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                    }}
                  />
                  <input
                    type="text"
                    required
                    placeholder="Coordinator Email or ID"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="cyber-login-input"
                  />
                </div>

                {/* Password */}
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#64748b',
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="cyber-login-input"
                    style={{ paddingRight: '48px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="cyber-auth-row">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        accentColor: '#00f0ff',
                        cursor: 'pointer',
                      }}
                    />
                    <span>Remember me</span>
                  </label>
                  <a
                    href="mailto:support@cybersentinel.in?subject=Coordinator%20Password%20Reset%20Request"
                    style={{ color: '#00f0ff', textDecoration: 'none', fontWeight: 500 }}
                    onMouseEnter={(e) => (e.target.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.target.style.textDecoration = 'none')}
                  >
                    Forgot Password?
                  </a>
                </div>

                {/* Glowing Pill Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="cyber-login-btn"
                  style={{ marginTop: '10px' }}
                >
                  <span>{isLoading ? 'Authenticating...' : 'LOGIN'}</span>
                  <ArrowRight size={18} />
                </button>
              </form>

              {/* Portal Switchers */}
              <div
                style={{
                  marginTop: '28px',
                  paddingTop: '20px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <Link
                  to="/admin/login"
                  style={{ fontSize: '13px', color: '#c084fc', textDecoration: 'none', fontWeight: 600 }}
                >
                  Switch to Administrator Login →
                </Link>
                <Link
                  to="/"
                  style={{ fontSize: '12px', color: '#64748b', textDecoration: 'none' }}
                >
                  ← Back to Public Portal Hub
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
