import React from 'react';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <div style={{ marginTop: '2px' }}>
              {isSuccess && <CheckCircle2 size={20} color="#34d399" />}
              {isError && <AlertCircle size={20} color="#f87171" />}
              {isWarning && <AlertTriangle size={20} color="#fbbf24" />}
              {!isSuccess && !isError && !isWarning && <Info size={20} color="#38bdf8" />}
            </div>
            <div style={{ flex: 1 }}>
              {toast.title && (
                <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '2px' }}>
                  {toast.title}
                </div>
              )}
              <div style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{toast.message}</div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                color: '#94a3b8',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
