import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Settings as SettingsIcon,
  Shield,
  Save,
  CheckCircle2,
  Mail,
  Lock,
  Globe,
  Bell,
  Sparkles,
} from 'lucide-react';

export default function AdminSettings() {
  const { adminProfile } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('General');

  // Form states
  const [profileName, setProfileName] = useState(adminProfile?.name || 'Admin');
  const [profileEmail, setProfileEmail] = useState(adminProfile?.email || 'admin@cybersentinel.in');
  const [profileRole, setProfileRole] = useState(adminProfile?.role || 'Super Admin');

  // Toggle settings matching mockup
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [requireDocUpload, setRequireDocUpload] = useState(false);
  const [autoVerification, setAutoVerification] = useState(true);
  const [sendConfirmationEmail, setSendConfirmationEmail] = useState(true);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      addToast('Settings updated successfully!', 'success');
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header Matching Mockup Screen 4 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage admin preferences
        </p>
      </div>

      {/* Tabs Row Matching Mockup */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        {['General', 'Events', 'Mail Templates', 'Security'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
              activeTab === tab
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                : 'text-slate-400 hover:text-white bg-white/[0.03]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Admin Profile Section */}
        <div className="glass-card p-6 border-white/[0.08] space-y-4">
          <h2 className="text-base font-bold font-heading text-white tracking-wide border-b border-white/[0.06] pb-3">
            Admin Profile
          </h2>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
              <label className="text-slate-400 font-medium">Name</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="cyber-input w-full text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
              <label className="text-slate-400 font-medium">Email</label>
              <div className="sm:col-span-2">
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="cyber-input w-full text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3">
              <label className="text-slate-400 font-medium">Role</label>
              <div className="sm:col-span-2">
                <input
                  type="text"
                  disabled
                  value={profileRole}
                  className="cyber-input w-full text-xs opacity-70 bg-black/40 font-mono text-brand-purple"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Event Settings with Mockup Toggles */}
        <div className="glass-card p-6 border-white/[0.08] space-y-4">
          <h2 className="text-base font-bold font-heading text-white tracking-wide border-b border-white/[0.06] pb-3">
            Event Settings
          </h2>

          <div className="space-y-5 text-xs">
            {/* Toggle 1: Registration Open */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Registration Open</div>
                <div className="text-slate-500 mt-0.5">
                  Allow public visitors to register for Day 1 and Day 2 events
                </div>
              </div>
              <label className="cyber-switch shrink-0">
                <input
                  type="checkbox"
                  checked={registrationOpen}
                  onChange={(e) => setRegistrationOpen(e.target.checked)}
                />
                <span className="cyber-slider"></span>
              </label>
            </div>

            {/* Toggle 2: Require Document Upload */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
              <div>
                <div className="font-semibold text-white">Require Document Upload</div>
                <div className="text-slate-500 mt-0.5">
                  Demand student ID card and bonafide certificate at registration
                </div>
              </div>
              <label className="cyber-switch shrink-0">
                <input
                  type="checkbox"
                  checked={requireDocUpload}
                  onChange={(e) => setRequireDocUpload(e.target.checked)}
                />
                <span className="cyber-slider"></span>
              </label>
            </div>

            {/* Toggle 3: Auto Verification for College Mail IDs */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
              <div>
                <div className="font-semibold text-white">
                  Auto Verification for College Mail IDs
                </div>
                <div className="text-slate-500 mt-0.5">
                  Automatically verify registrations originating from official partner domains
                </div>
              </div>
              <label className="cyber-switch shrink-0">
                <input
                  type="checkbox"
                  checked={autoVerification}
                  onChange={(e) => setAutoVerification(e.target.checked)}
                />
                <span className="cyber-slider"></span>
              </label>
            </div>

            {/* Toggle 4: Send Confirmation Email */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
              <div>
                <div className="font-semibold text-white">Send Confirmation Email</div>
                <div className="text-slate-500 mt-0.5">
                  Dispatches pass badge link immediately upon payment approval
                </div>
              </div>
              <label className="cyber-switch shrink-0">
                <input
                  type="checkbox"
                  checked={sendConfirmationEmail}
                  onChange={(e) => setSendConfirmationEmail(e.target.checked)}
                />
                <span className="cyber-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Save Button Matching Mockup */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-cyber-login text-xs py-2.5 px-8"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
