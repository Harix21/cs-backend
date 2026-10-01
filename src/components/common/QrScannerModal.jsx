import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Modal } from './Modal';
import { Camera, Search, AlertCircle } from 'lucide-react';
import { extractQrToken } from '../../utils/helpers';

export function QrScannerModal({ isOpen, onClose, onScan, onScanSuccess, title = 'Scan QR Code', placeholder = 'Enter Registration ID or Token' }) {
  const [manualCode, setManualCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const readerId = 'html5-qr-reader-container';

  useEffect(() => {
    let html5QrCode = null;

    if (isOpen) {
      setErrorMsg('');
      const startScanner = async () => {
        try {
          // Wait briefly for modal DOM node to mount
          await new Promise((r) => setTimeout(r, 200));
          const container = document.getElementById(readerId);
          if (!container) return;

          html5QrCode = new Html5Qrcode(readerId);
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              const token = extractQrToken(decodedText);
              if (token) {
                if (onScanSuccess) onScanSuccess(token);
                if (onScan) onScan({ qrToken: token });
              }
            },
            () => {}
          );
          setIsScanning(true);
        } catch (err) {
          console.warn('Camera scan start failed:', err);
          setErrorMsg('Camera access unavailable or permission denied. You can enter the Registration ID manually below.');
          setIsScanning(false);
        }
      };

      startScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {})
          .finally(() => {
            scannerRef.current?.clear();
            scannerRef.current = null;
          });
      }
    };
  }, [isOpen, onScan]);

  function handleManualSubmit(e) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const token = extractQrToken(manualCode.trim());
    if (onScanSuccess) onScanSuccess(token || manualCode.trim());
    if (onScan) onScan({ registrationCode: manualCode.trim(), qrToken: token });
    setManualCode('');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="560px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Scanner view */}
        <div
          style={{
            position: 'relative',
            background: '#040711',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--border-cyan)',
            minHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div id={readerId} style={{ width: '100%' }}></div>
          {!isScanning && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Camera size={44} color="var(--accent-cyan)" style={{ marginBottom: '10px' }} />
              <p style={{ fontSize: '0.9rem' }}>Initializing camera preview...</p>
            </div>
          )}
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#f87171',
              fontSize: '0.85rem',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Manual lookup input */}
        <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="form-input"
            style={{ flex: 1 }}
            placeholder={placeholder}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0 18px' }}>
            <Search size={18} /> Lookup
          </button>
        </form>
      </div>
    </Modal>
  );
}

export default QrScannerModal;
