import React from 'react';

export function StatCard({ title, value, subtitle, icon: Icon, color = 'cyan' }) {
  const glowColors = {
    cyan: 'var(--accent-cyan-glow)',
    purple: 'rgba(168, 85, 247, 0.3)',
    green: 'rgba(52, 211, 153, 0.3)',
    amber: 'rgba(251, 191, 36, 0.3)',
    rose: 'rgba(244, 63, 94, 0.3)',
  };

  const textColors = {
    cyan: 'var(--accent-cyan)',
    purple: 'var(--accent-purple)',
    green: '#34d399',
    amber: '#fbbf24',
    rose: '#fb7185',
  };

  return (
    <div
      className="glass-card"
      style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            color: 'var(--text-muted)',
            fontSize: '0.82rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: '6px',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: '1.9rem',
            fontWeight: 800,
            fontFamily: 'var(--font-heading)',
            color: textColors[color] || 'var(--text-main)',
            lineHeight: 1.1,
          }}
        >
          {value !== undefined && value !== null ? value : '—'}
        </div>
        {subtitle && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
            {subtitle}
          </div>
        )}
      </div>

      {Icon && (
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: glowColors[color] || 'rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: textColors[color] || 'var(--accent-cyan)',
          }}
        >
          <Icon size={24} />
        </div>
      )}
    </div>
  );
}

export default StatCard;
