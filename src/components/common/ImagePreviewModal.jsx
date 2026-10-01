import React from 'react';
import { Modal } from './Modal';
import { ExternalLink, Download } from 'lucide-react';

export function ImagePreviewModal({ isOpen, onClose, imageUrl, title = 'Payment Screenshot Proof' }) {
  if (!imageUrl) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="600px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <div
          style={{
            width: '100%',
            maxHeight: '65vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--border-light)',
          }}
        >
          <img
            src={imageUrl}
            alt="Payment Proof"
            style={{
              maxWidth: '100%',
              maxHeight: '65vh',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'flex-end' }}>
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '8px 14px' }}
          >
            <ExternalLink size={16} /> Open in New Tab
          </a>
          <a
            href={imageUrl}
            download="payment-screenshot.png"
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '8px 14px' }}
          >
            <Download size={16} /> Download Image
          </a>
        </div>
      </div>
    </Modal>
  );
}

export default ImagePreviewModal;
