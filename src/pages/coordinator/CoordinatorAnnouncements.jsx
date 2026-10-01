import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getCoordinatorAssignedEvents,
  saveCoordinatorAnnouncement,
} from '../../services/coordinatorService';
import { openGmailCompose } from '../../utils/helpers';
import {
  Bell,
  Send,
  Layers,
  Users,
  CheckSquare,
  Square,
  RefreshCw,
  Mail,
  AlertCircle,
} from 'lucide-react';

export default function CoordinatorAnnouncements() {
  const { user, getCoordinatorClientInstance } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [assignedSpecialEvents, setAssignedSpecialEvents] = useState([]);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audienceFilter, setAudienceFilter] = useState('ALL');

  // Recipients
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
            console.warn('Coordinator announcements events error:', evErr);
          }
        }

        setAssignedEvents(normalEvents);
        setAssignedSpecialEvents(specialEvents);
      } catch (err) {
        console.warn('Coordinator announcements error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  const loadRecipients = async (audience) => {
    try {
      setLoadingRecipients(true);
      const [kind, selectedId] = audience.split(':');
      let access = [];

      if (kind === 'SPECIAL') {
        const { data } = await client
          .from('special_event_registrations')
          .select('registration_id')
          .eq('special_event_id', selectedId);
        access = data || [];
      } else if (kind === 'EVENT') {
        const { data } = await client
          .from('event_registrations')
          .select('registration_id')
          .eq('event_id', selectedId);
        access = data || [];
      } else {
        const normalIds = assignedEvents.map((e) => e.id);
        const specialIds = assignedSpecialEvents.map((s) => s.id);

        const [{ data: normal }, { data: special }] = await Promise.all([
          normalIds.length
            ? client.from('event_registrations').select('registration_id').in('event_id', normalIds)
            : Promise.resolve({ data: [] }),
          specialIds.length
            ? client.from('special_event_registrations').select('registration_id').in('special_event_id', specialIds)
            : Promise.resolve({ data: [] }),
        ]);

        access = [...(normal || []), ...(special || [])];
      }

      const ids = [...new Set(access.map((r) => r.registration_id))];
      if (!ids.length) {
        setRecipients([]);
        setSelectedIds(new Set());
        return;
      }

      const { data: regData } = await client
        .from('registrations')
        .select('id, registration_code, participants(name, email)')
        .in('id', ids);

      const validList = (regData || []).filter((r) => r.participants?.email);
      setRecipients(validList);
      setSelectedIds(new Set(validList.map((r) => r.id)));
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to load audience recipients', 'error');
    } finally {
      setLoadingRecipients(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      loadRecipients(audienceFilter);
    }
  }, [audienceFilter, loading, assignedEvents, assignedSpecialEvents]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      addToast('Please provide both title and announcement message', 'error');
      return;
    }

    try {
      setSaving(true);
      const [kind, selectedId] = audienceFilter.split(':');

      const payload = {
        title: title.trim(),
        message: message.trim(),
        target_scope: kind === 'SPECIAL' ? 'SPECIAL' : kind === 'EVENT' ? 'EVENT' : 'ALL',
        target_event_id: kind === 'EVENT' ? selectedId : null,
        target_special_event_id: kind === 'SPECIAL' ? selectedId : null,
        created_by: user.id,
      };

      await saveCoordinatorAnnouncement(client, payload);

      // Collect recipient emails
      const targetRecipients = recipients.filter((r) => selectedIds.has(r.id));
      const bccEmails = targetRecipients
        .map((r) => r.participants?.email)
        .filter(Boolean)
        .join(',');

      if (bccEmails) {
        openGmailCompose('', title.trim(), message.trim(), bccEmails);
        addToast('Announcement saved & Gmail compose launched!', 'success');
      } else {
        addToast('Announcement saved to system records.', 'success');
      }

      setTitle('');
      setMessage('');
    } catch (err) {
      console.error(err);
      addToast(err.message || 'Failed to post announcement', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-brand-cyan" />
          Event Announcements & Broadcast
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Post notices to your event attendees and broadcast announcements directly via Gmail.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Compose Form */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
            <h2 className="text-lg font-bold font-heading text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-brand-cyan" />
              New Announcement
            </h2>

            {/* Target Audience */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Target Audience
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 text-brand-cyan absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value)}
                  className="cyber-input pl-9 text-sm w-full"
                >
                  <option value="ALL">All Assigned Participants</option>
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

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Announcement Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Schedule Update: Coding Round venue moved to Lab 3"
                className="cyber-input w-full text-sm"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Announcement Content / Body *
              </label>
              <textarea
                rows={6}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your announcement details here. This message will be recorded in the system and pre-filled in your Gmail broadcast..."
                className="cyber-input w-full text-sm"
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-brand-cyan" />
                <span>
                  Will launch Gmail with <strong>{selectedIds.size}</strong> BCC recipient(s)
                </span>
              </div>

              <button
                type="submit"
                disabled={saving || !title.trim() || !message.trim()}
                className="btn-primary text-sm flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Save & Broadcast</span>
              </button>
            </div>
          </form>
        </div>

        {/* Recipients Preview / Checklist */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-6 flex flex-col h-full max-h-[600px]">
            <div className="flex items-center justify-between pb-3 border-b border-cyber-border">
              <div>
                <h3 className="text-sm font-bold font-heading text-white flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-brand-cyan" />
                  Recipients List ({recipients.length})
                </h3>
                <span className="text-xs text-slate-400">
                  {selectedIds.size} selected for broadcast
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
                  <span className="text-xs">Loading recipients...</span>
                </div>
              ) : recipients.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  No registered participants found in this audience.
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
