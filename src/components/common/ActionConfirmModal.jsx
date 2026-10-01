import React, { useState } from 'react';
import Modal from './Modal';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function ActionConfirmModal({ isOpen, onClose, onConfirm, title, message, type = 'confirm', confirmText = 'Confirm', isDanger = false }) {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const handleConfirm = (e) => {
    e.preventDefault();
    onConfirm(type === 'prompt' ? inputValue : true);
    setInputValue('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleConfirm} className="space-y-4">
        <div className="flex gap-4">
          <div className="shrink-0 mt-1">
            {type === 'prompt' ? (
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            ) : isDanger ? (
              <XCircle className="w-6 h-6 text-rose-500" />
            ) : (
              <CheckCircle className="w-6 h-6 text-emerald-500" />
            )}
          </div>
          <div>
            <p className="text-sm text-slate-300">{message}</p>
            {type === 'prompt' && (
              <div className="mt-4">
                <input
                  type="text"
                  autoFocus
                  required
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="cyber-input w-full text-sm"
                  placeholder="Enter reason..."
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`btn-primary text-sm ${isDanger ? 'bg-rose-600 hover:bg-rose-500' : ''}`}
          >
            {confirmText}
          </button>
        </div>
      </form>
    </Modal>
  );
}
