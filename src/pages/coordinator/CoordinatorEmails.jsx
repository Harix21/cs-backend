import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { getCoordinatorAssignedEvents } from '../../services/coordinatorService';
import { openGmailCompose } from '../../utils/helpers';
import {
  Mail,
  Send,
  Users,
  CheckSquare,
  Square,
  RefreshCw,
  Layers,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function CoordinatorEmails() {
  const { user, getCoordinatorClientInstance } = useAuth();
  const { addToast } = useToast();

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [assignedSpecialEvents, setAssignedSpecialEvents] = useState([]);

  // Form State
  const [audience, setAudience] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const client = getCoordinatorClientInstance();

  useEffect(() => {
    async function loadEvents() {
      try {
        const coordId = user?.id || coordinatorProfile?.id;
        let normalEvents = [];
        let specialEvents = [];

        if (coordId) {
          try {
            const eventsData = await getCoordinatorAssignedEvents(client, coordId);
            normalEvents = eventsData.normalEvents || [];
            specialEvents = eventsData.specialEvents || [];
          } catch (evErr) {
            console.warn('Coordinator email events error:', evErr);
          }
        }

        setAssignedEvents(normalEvents);
        setAssignedSpecialEvents(specialEvents);
        if (normalEvents.length > 0) {
          setAudience(`EVENT:${normalEvents[0].id}`);
        } else if (specialEvents.length > 0) {
          setAudience(`SPECIAL:${specialEvents[0].id}`);
        }
      } catch (err) {
        console.warn('Coordinator emails error:', err);
      } finally {
        setLoadingEvents(false);
      }
    }
    loadEvents();
  }, []);

  const loadRecipients = async (audienceStr) => {
    if (!audienceStr) {
      setRecipients([]);
      setSelectedIds(new Set());
      return;
    }

    try {
      setLoadingRecipients(true);
      const [kind, id] = audienceStr.split(':');
      let regIds = [];

      if (kind === 'SPECIAL') {
        const { data } = await client
          .from('special_event_registrations')
          .select('registration_id')
          .eq('special_event_id', id);
        regIds = (data || []).map((r) => r.registration_id);
      } else if (kind === 'EVENT') {
        const { data } = await client
          .from('event_registrations')
          .select('registration_id')
          .eq('event_id', id);
        regIds = (data || []).map((r) => r.registration_id);
      }

      if (!regIds.length) {
        setRecipients([]);
        setSelectedIds(new Set());
        return;
      }

      const { data: regData } = await client
        .from('registrations')
        .select('id, registration_code, participants(name, email)')
        .in('id', regIds);

      const validList = (regData || []).filter((r) => r.participants?.email);
      setRecipients(validList);
      setSelectedIds(new Set(validList.map((r) => r.id)));
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to fetch recipients', 'error');
    } finally {
      setLoadingRecipients(false);
    }
  };

  useEffect(() => {
    if (audience) {
      loadRecipients(audience);
    }
  }, [audience]);

  const toggleSelectAll = () => {
    if (selectedIds.size === recipients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(recipients.map((r) => r.id)));
    }
  };

  const toggleSelectId = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSendGmail = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      addToast('Please enter both subject and message', 'error');
      return;
    }

    const targetList = recipients.filter((r) => selectedIds.has(r.id));
    if (targetList.length === 0) {
      addToast('Please select at least one recipient', 'error');
      return;
    }

    const bccEmails = targetList
      .map((r) => r.participants?.email)
      .filter(Boolean)
      .join(',');

    openGmailCompose('', subject.trim(), message.trim(), bccEmails);
    addToast('Gmail compose window opened successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-white flex items-center gap-2">
          <Mail className="w-6 h-6 text-brand-cyan" />
          Event Participant Emailer
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Compose targeted communications to participants enrolled in your assigned symposium events.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Email Form */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleSendGmail} className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-bold font-heading text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-cyan" />
              Compose Email
            </h2>

            {/* Event Audience */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Target Event Audience
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-brand-cyan absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="cyber-input pl-9 text-sm w-full"
                >
                  <option value="">Select Audience</option>
                  {assignedEvents.map((ev) => (
                    <option key={ev.id} value={`EVENT:${ev.id}`}>
                      {ev.code} · {ev.name} ({ev.day})
                    </option>
                  ))}
                  {assignedSpecialEvents.map((sp) => (
                    <option key={sp.id} value={`SPECIAL:${sp.id}`}>
                      Special ({sp.name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Subject *
              </label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Important Instructions: CyberSentinel 2K26 - Round 1"
                className="cyber-input w-full text-sm"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Message *
              </label>
              <textarea
                rows={8}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Dear Participants,\n\nPlease make sure to arrive at the venue 15 minutes before the scheduled time with your registered laptop and digital badge pass..."
                className="cyber-input w-full text-sm font-sans"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand-cyan" />
                <span>
                  <strong>{selectedIds.size}</strong> recipient(s) will receive this in BCC
                </span>
              </div>

              <button
                type="submit"
                disabled={selectedIds.size === 0 || !subject.trim() || !message.trim()}
                className="btn-primary text-sm flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-brand-cyan to-brand-blue"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open in Gmail</span>
              </button>
            </div>
          </form>
        </div>

        {/* Recipients Checklist */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-6 flex flex-col h-full max-h-[600px]">
            <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
              <div>
                <h3 className="text-sm font-bold font-heading text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-brand-cyan" />
                  Target Audience ({recipients.length})
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedIds.size} selected
                </span>
              </div>

              {recipients.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="btn-ghost text-xs py-1 px-2 text-brand-cyan flex items-center gap-1"
                >
                  {selectedIds.size === recipients.length ? (
                    <>
                      <CheckSquare className="w-3.5 h-3.5" />
                      Deselect
                    </>
                  ) : (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      Select All
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-1.5">
              {loadingRecipients ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-brand-cyan" />
                  <span className="text-xs">Loading audience...</span>
                </div>
              ) : recipients.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No participants enrolled in this event yet.
                </div>
              ) : (
                recipients.map((rec) => {
                  const isChecked = selectedIds.has(rec.id);
                  return (
                    <div
                      key={rec.id}
                      onClick={() => toggleSelectId(rec.id)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                        isChecked
                          ? 'border-brand-cyan/40 bg-brand-cyan/10 text-white'
                          : 'border-cyber-border bg-cyber-dark/40 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {rec.participants?.name || 'Participant'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {rec.participants?.email}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-brand-cyan shrink-0">
                        {rec.registration_code}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
