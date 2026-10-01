import React from 'react';
import { Shield, Lock, Terminal } from 'lucide-react';

export function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-light)',
        padding: '40px clamp(18px, 6vw, 84px)',
        marginTop: '80px',
        color: 'var(--text-dim)',
        fontSize: '0.85rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Shield size={16} color="var(--accent-cyan)" />
        <span>Cyber Sentinel 2K26 • Secure National Technical Symposium Operations</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Lock size={14} color="#34d399" /> Supabase RLS Protected
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Terminal size={14} color="#818cf8" /> Powered by React & Vite
        </span>
      </div>
    </footer>
  );
}
