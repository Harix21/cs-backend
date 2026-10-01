import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { generateQrDataUrl } from '../../utils/qrBadge';
import { ShieldCheck, QrCode, ArrowLeft, CheckCircle2 } from 'lucide-react';

export function QrPassVerify() {
  const { token: paramToken } = useParams();
  const [token, setToken] = useState(paramToken || '');
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (paramToken) {
      setToken(paramToken);
    } else {
      // Check query parameter or path
      const url = new URL(window.location.href);
      const qToken = url.searchParams.get('token');
      if (qToken) {
        setToken(qToken);
      }
    }
  }, [paramToken]);

  useEffect(() => {
    async function makeQr() {
      if (!token) return;
      try {
        const url = await generateQrDataUrl(window.location.href, { width: 320 });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Error generating QR:', err);
      }
    }
    makeQr();
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, width: 'min(640px, calc(100% - 36px))', margin: '60px auto 0', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '40px 32px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(0, 240, 255, 0.12)',
              color: 'var(--accent-cyan)',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 25px var(--accent-cyan-glow)',
            }}
          >
            <ShieldCheck size={32} />
          </div>

          <h1 style={{ fontSize: '1.9rem', marginBottom: '8px' }}>Cyber Sentinel QR Pass</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '28px' }}>
            This pass is ready to be scanned at the event entry desk. Show this screen or your saved badge to an event coordinator.
          </p>

          {/* QR Display */}
          <div
            style={{
              background: '#ffffff',
              padding: '18px',
              borderRadius: '20px',
              display: 'inline-block',
              boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5), 0 0 30px var(--accent-cyan-glow)',
              marginBottom: '24px',
            }}
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Cyber Sentinel Pass QR" style={{ width: '260px', height: '260px', display: 'block' }} />
            ) : (
              <div
                style={{
                  width: '260px',
                  height: '260px',
                  display: 'grid',
                  placeItems: 'center',
                  color: '#94a3b8',
                }}
              >
                <QrCode size={64} />
              </div>
            )}
          </div>

          {token && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
                color: 'var(--accent-cyan)',
                background: 'rgba(0, 240, 255, 0.05)',
                border: '1px solid var(--border-cyan)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 16px',
                wordBreak: 'break-all',
                maxWidth: '480px',
                margin: '0 auto 24px',
              }}
            >
              Pass Token: {token}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <Link to="/check" className="btn btn-secondary">
              <ArrowLeft size={16} /> Lookup Another Pass
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default QrPassVerify;
