import React from 'react';
import { Modal } from './Modal';
import { StatusBadge } from '../ui/StatusBadge';

export function DetailsModal({ isOpen, onClose, title = 'Details', data }) {
  if (!data) return null;

  function renderValue(val, key = '') {
    if (val === null || val === undefined || val === '') {
      return <span style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>Not provided</span>;
    }

    if (typeof val === 'boolean') {
      return <StatusBadge status={val ? 'YES' : 'NO'} />;
    }

    if (
      typeof val === 'string' &&
      ['VERIFIED', 'PENDING', 'UNDER_REVIEW', 'REJECTED', 'ACTIVE', 'INACTIVE', 'CONFIRMED', 'PRESENT', 'ABSENT'].includes(
        val.toUpperCase()
      )
    ) {
      return <StatusBadge status={val} />;
    }

    if (Array.isArray(val)) {
      if (!val.length) return <span style={{ color: 'var(--text-dim)' }}>Empty list</span>;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {val.map((item, idx) => (
            <div
              key={idx}
              style={{
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
              }}
            >
              {renderValue(item)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof val === 'object') {
      return (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          {Object.entries(val).map(([k, v]) => (
            <div key={k} style={{ fontSize: '0.88rem' }}>
              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                  marginBottom: '2px',
                }}
              >
                {k.replace(/_/g, ' ')}
              </div>
              <div style={{ wordBreak: 'break-word' }}>{renderValue(v, k)}</div>
            </div>
          ))}
        </div>
      );
    }

    return <span>{String(val)}</span>;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="720px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Object.entries(data).map(([key, value]) => {
          if (key === 'screenshot_url' || key === 'screenshot_path') return null;
          return (
            <div
              key={key}
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                paddingBottom: '12px',
              }}
            >
              <div
                style={{
                  color: 'var(--accent-cyan)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: '6px',
                }}
              >
                {key.replace(/_/g, ' ')}
              </div>
              <div style={{ color: 'var(--text-main)' }}>{renderValue(value, key)}</div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export default DetailsModal;
