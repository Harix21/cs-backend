import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { useToast } from '../../context/ToastContext';
import { checkRegistrationStatus } from '../../services/registrationService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatCurrency } from '../../utils/helpers';
import { generateAndDownloadPassBadge, generateQrDataUrl } from '../../utils/qrBadge';
import {
  Search,
  QrCode,
  Download,
  Printer,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export function CheckStatus() {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isGeneratingBadge, setIsGeneratingBadge] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cs_last_registration') || 'null');
      if (stored) {
        if (stored.email) setEmail(stored.email);
        if (stored.phone) setPhone(stored.phone);
      }
    } catch {
      // ignore
    }
  }, []);

  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!email.trim() || !phone.trim()) {
      addToast({
        title: 'Input Missing',
        message: 'Please enter both your registered email and phone number.',
        type: 'error',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setQrDataUrl('');

    try {
      const data = await checkRegistrationStatus(email, phone);
      setResult(data);

      if (data.qr_url) {
        const url = await generateQrDataUrl(data.qr_url, { width: 280 });
        setQrDataUrl(url);
      }

      if (data.payment?.status === 'VERIFIED') {
        addToast({
          title: 'Registration Verified!',
          message: 'Your official QR entry pass is ready for download.',
          type: 'success',
        });
      } else {
        addToast({
          title: 'Record Located',
          message: `Registration status: ${data.registration.status}. Payment is under review.`,
          type: 'info',
        });
      }
    } catch (err) {
      addToast({
        title: 'Check Failed',
        message: err.message || 'No matching registration found. Please verify details.',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDownloadBadge() {
    if (!result || !result.qr_url) return;
    setIsGeneratingBadge(true);
    try {
      await generateAndDownloadPassBadge({
        registrationCode: result.registration.registration_code,
        participantName: result.participant.name,
        selectedDay: result.registration.selected_day,
        college: result.participant.college,
        department: result.participant.department,
        qrText: result.qr_url,
      });
      addToast({
        title: 'Pass Downloaded',
        message: 'Your high-res entry pass badge has been saved.',
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Download Failed',
        message: err.message,
        type: 'error',
      });
    } finally {
      setIsGeneratingBadge(false);
    }
  }

  function handleDownloadConfirmationTxt() {
    if (!result) return;
    const txt = `
========================================
CYBER SENTINEL 2K26 - REGISTRATION RECORD
========================================
Registration ID: ${result.registration.registration_code}
Participant:     ${result.participant.name}
College:         ${result.participant.college}
Department:      ${result.participant.department}
Registered Day:  ${result.registration.selected_day}
Status:          ${result.registration.status}
Payment Status:  ${result.payment?.status || 'PENDING'}
UTR Reference:   ${result.payment?.utr_masked || 'Hidden'}
Amount Paid:     ₹${result.payment?.amount || '0'}
Verification URL:${result.qr_url || 'Available after verification'}
========================================
Please present your official QR pass at the entrance desk.
`.trim();

    const blob = new Blob([txt], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${result.registration.registration_code}-confirmation.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, width: 'min(900px, calc(100% - 36px))', margin: '40px auto 0' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              color: '#34d399',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            CONFIRMATION & QR PASS CHECKER
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: '8px' }}>
            Check Your <span className="gradient-text-cyan">Registration</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Enter the registered email and phone number to check verification status and access your entry pass.
          </p>
        </div>

        {/* Lookup Card */}
        <form onSubmit={handleSearch} className="glass-card" style={{ padding: '28px', marginBottom: '28px' }}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Registered Email Address *</label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="name@college.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Registered Phone Number *</label>
              <input
                type="tel"
                required
                className="form-input"
                placeholder="10-digit phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              No Registration ID required — lookup securely with email & phone.
            </span>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary"
              style={{ padding: '10px 24px' }}
            >
              <Search size={18} /> {isLoading ? 'Searching...' : 'Check Registration'}
            </button>
          </div>
        </form>

        {/* Search Results Display */}
        {result && (
          <div className="glass-card" style={{ padding: '32px', marginBottom: '32px' }} id="printablePass">
            {/* Top Bar of Record */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '16px',
                borderBottom: '1px solid var(--border-light)',
                paddingBottom: '20px',
                marginBottom: '24px',
              }}
            >
              <div>
                <span className="badge badge-info" style={{ marginBottom: '8px' }}>
                  REGISTRATION RECORD
                </span>
                <h2 style={{ fontSize: '1.8rem', color: 'var(--text-main)', margin: '4px 0' }}>
                  {result.participant.name}
                </h2>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>
                  Registration ID:{' '}
                  <strong style={{ color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                    {result.registration.registration_code}
                  </strong>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '6px' }}>
                  Payment Status
                </div>
                <StatusBadge status={result.payment?.status || 'PENDING'} />
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid-3" style={{ marginBottom: '28px' }}>
              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  College
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {result.participant.college || '—'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  Department
                </div>
                <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                  {result.participant.department || '—'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  Registered Day
                </div>
                <div style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  {result.registration.selected_day}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  UTR Reference
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {result.payment?.utr_masked || 'Hidden'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  Payment Amount
                </div>
                <div style={{ fontWeight: 700, color: '#34d399' }}>
                  {result.payment ? formatCurrency(result.payment.amount) : '—'}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  Symposium Status
                </div>
                <div>
                  <StatusBadge status={result.registration.status} />
                </div>
              </div>
            </div>

            {/* Team Info Card */}
            <div
              style={{
                background: 'rgba(6, 12, 26, 0.5)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '18px',
                marginBottom: '28px',
              }}
            >
              {result.team ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                      Team: {result.team.team_name}
                    </h3>
                    <StatusBadge status={result.team.status} />
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
                    {result.team.event_name} • Code: <strong>{result.team.team_code}</strong>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {result.team.members.map((m, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '4px 10px',
                          background: 'rgba(255,255,255,0.05)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.82rem',
                          color: 'var(--text-main)',
                        }}
                      >
                        {m.name} ({m.member_role})
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <strong style={{ color: 'var(--text-main)' }}>No Team Linked Currently</strong>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      If you registered for a team event, you can create or join a team anytime.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link to="/team/create" className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                      Create Team
                    </Link>
                    <Link to="/team/join" className="btn btn-secondary" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                      Join Team
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Official Entry QR Pass Section */}
            {qrDataUrl ? (
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08), rgba(129, 140, 248, 0.08))',
                  border: '1px solid var(--border-cyan)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '28px',
                  textAlign: 'center',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: 'var(--accent-cyan)',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  <ShieldCheck size={16} /> OFFICIAL VERIFIED ENTRY PASS
                </div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Your Gate Entry Pass</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto 20px' }}>
                  Present this QR code on your phone or printout at the event reception desk.
                </p>

                <div
                  style={{
                    background: '#ffffff',
                    padding: '16px',
                    borderRadius: '16px',
                    display: 'inline-block',
                    boxShadow: '0 0 35px var(--accent-cyan-glow)',
                    marginBottom: '20px',
                  }}
                >
                  <img src={qrDataUrl} alt="Cyber Sentinel Pass QR" style={{ width: '220px', height: '220px', display: 'block' }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleDownloadBadge}
                    disabled={isGeneratingBadge}
                    className="btn btn-primary"
                  >
                    <Download size={18} /> {isGeneratingBadge ? 'Generating Badge...' : 'Download Pass Badge (PNG)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn btn-secondary"
                  >
                    <Printer size={18} /> Print Record
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadConfirmationTxt}
                    className="btn btn-secondary"
                  >
                    <FileText size={18} /> Download Text Receipt
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: 'rgba(251, 191, 36, 0.08)',
                  border: '1px solid rgba(251, 191, 36, 0.25)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  textAlign: 'center',
                  color: '#fbbf24',
                }}
              >
                <Clock size={28} style={{ margin: '0 auto 8px', display: 'block' }} />
                <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem' }}>Payment Under Review</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Your official gate entry QR code will appear right here as soon as our admin team verifies your payment proof.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick Team actions banner */}
        <section
          className="glass-card"
          style={{
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            borderColor: 'rgba(168, 85, 247, 0.25)',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 4px', color: 'var(--text-main)' }}>
              Participating in Team Events?
            </h3>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-dim)' }}>
              Create an event team package or join your teammates using their team code.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/team/create" className="btn btn-primary" style={{ fontSize: '0.88rem' }}>
              Create Team
            </Link>
            <Link to="/team/join" className="btn btn-secondary" style={{ fontSize: '0.88rem' }}>
              Join Team
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default CheckStatus;
