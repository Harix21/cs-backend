import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { useToast } from '../../context/ToastContext';
import { callTeamManagement } from '../../services/registrationService';
import { copyToClipboard } from '../../utils/helpers';
import {
  Users2,
  CheckCircle2,
  Copy,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export function TeamCreate() {
  const { addToast } = useToast();

  const [leaderIdentity, setLeaderIdentity] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedLeader, setVerifiedLeader] = useState(null);
  const [packages, setPackages] = useState({ DAY_1: [], DAY_2: [] });

  const [teamName, setTeamName] = useState('');
  const [teamDay, setTeamDay] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [memberIdentities, setMemberIdentities] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [createdTeam, setCreatedTeam] = useState(null);

  async function handleVerifyLeader(e) {
    e.preventDefault();
    if (!leaderIdentity.trim()) {
      addToast({ title: 'Input Required', message: 'Enter your registered email or Registration ID.', type: 'error' });
      return;
    }

    setIsVerifying(true);
    setVerifiedLeader(null);
    setCreatedTeam(null);

    try {
      const data = await callTeamManagement({
        action: 'verify',
        identity: leaderIdentity.trim(),
      });

      setVerifiedLeader(data.registration);
      setPackages(data.packages || { DAY_1: [], DAY_2: [] });

      // Auto-set day if not registered for BOTH
      if (data.registration.selected_day !== 'BOTH') {
        setTeamDay(data.registration.selected_day);
      }

      addToast({
        title: 'Leader Verified',
        message: `${data.registration.participant_name} verified. Configure your team below.`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Verification Failed',
        message: err.message || 'Unable to verify member. Ensure your payment has been verified by admin.',
        type: 'error',
      });
    } finally {
      setIsVerifying(false);
    }
  }

  // Get current packages for selected day
  const availablePackages = packages[teamDay] || [];
  const activePackage = availablePackages.find((p) => p.id === selectedPackageId);

  // Update member inputs when package changes
  function handlePackageChange(packageId) {
    setSelectedPackageId(packageId);
    const pkg = availablePackages.find((p) => p.id === packageId);
    const count = pkg?.size || 0;
    if (count > 1) {
      setMemberIdentities(new Array(count - 1).fill(''));
    } else {
      setMemberIdentities([]);
    }
  }

  function handleMemberIdentityChange(index, val) {
    setMemberIdentities((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  }

  async function handleCreateTeam(e) {
    e.preventDefault();
    if (!teamName.trim()) {
      addToast({ title: 'Team Name Required', message: 'Please enter a team name.', type: 'error' });
      return;
    }
    if (!teamDay || !selectedPackageId || !activePackage) {
      addToast({ title: 'Package Required', message: 'Please select a day and team package.', type: 'error' });
      return;
    }
    if (memberIdentities.some((val) => !val.trim())) {
      addToast({
        title: 'Incomplete Members',
        message: `Please provide all ${activePackage.size - 1} other member identities.`,
        type: 'error',
      });
      return;
    }

    setIsCreating(true);

    try {
      // Validate members first
      await Promise.all(
        memberIdentities.map((id) =>
          callTeamManagement({ action: 'verify', identity: id.trim() })
        )
      );

      const result = await callTeamManagement({
        action: 'create',
        identity: leaderIdentity.trim(),
        members: memberIdentities.map((m) => m.trim()),
        day: teamDay,
        package_id: activePackage.id,
        team_name: teamName.trim(),
      });

      setCreatedTeam(result.team);
      addToast({
        title: 'Team Created!',
        message: `Team "${teamName}" created successfully! Code: ${result.team.team_code}`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Creation Failed',
        message: err.message || 'Unable to create team.',
        type: 'error',
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, width: 'min(860px, calc(100% - 36px))', margin: '40px auto 0' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(168, 85, 247, 0.1)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              color: '#c084fc',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            TEAM CONFIGURATION PORTAL
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: '8px' }}>
            Create a <span className="gradient-text-purple">Team Package</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Choose your day and package. Every member must have verified payment and must not belong to another team.
          </p>
        </div>

        {/* Step 1: Leader Verification */}
        <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-info">1</span> Verify the Leader
          </h3>

          <form onSubmit={handleVerifyLeader} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              required
              className="form-input"
              style={{ flex: 1, minWidth: '240px' }}
              placeholder="Registered email or Registration ID (e.g. CS-1042)"
              value={leaderIdentity}
              onChange={(e) => setLeaderIdentity(e.target.value)}
            />
            <button type="submit" disabled={isVerifying} className="btn btn-primary">
              {isVerifying ? 'Verifying...' : 'Verify Leader'}
            </button>
          </form>

          {verifiedLeader && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: 'rgba(52, 211, 153, 0.08)',
                border: '1px solid rgba(52, 211, 153, 0.25)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#34d399',
                fontSize: '0.9rem',
              }}
            >
              <CheckCircle2 size={18} />
              <span>
                <strong>{verifiedLeader.participant_name}</strong> • Registration:{' '}
                {verifiedLeader.registration_code} • Payment Verified
              </span>
            </div>
          )}
        </div>

        {/* Step 2: Configure Team Form */}
        {verifiedLeader && (
          <form onSubmit={handleCreateTeam} className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-info">2</span> Configure the Team
            </h3>

            <div className="grid-3" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Team Name *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Cyber Guardians"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Symposium Day *</label>
                <select
                  required
                  className="form-select"
                  value={teamDay}
                  onChange={(e) => {
                    setTeamDay(e.target.value);
                    setSelectedPackageId('');
                    setMemberIdentities([]);
                  }}
                >
                  <option value="">Select Day</option>
                  <option value="DAY_1">Day 1 (Technical)</option>
                  <option value="DAY_2">Day 2 (Non-Technical)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Event Team Package *</label>
                <select
                  required
                  className="form-select"
                  value={selectedPackageId}
                  onChange={(e) => handlePackageChange(e.target.value)}
                  disabled={!teamDay}
                >
                  <option value="">{teamDay ? 'Select a Package' : 'Select a day first'}</option>
                  {availablePackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.events.map((e) => e.name).join(' + ')} • {pkg.size} members
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activePackage && (
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.2)',
                  fontSize: '0.88rem',
                  color: 'var(--text-muted)',
                  marginBottom: '24px',
                }}
              >
                This team package is valid for:{' '}
                <strong style={{ color: 'var(--accent-cyan)' }}>
                  {activePackage.events.map((e) => e.name).join(' and ')}
                </strong>
                . Exactly <strong>{activePackage.size}</strong> members are required.
              </div>
            )}

            {/* Member Input Fields */}
            {memberIdentities.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '14px', color: 'var(--text-main)' }}>
                  Other Verified Team Members ({memberIdentities.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {memberIdentities.map((val, idx) => (
                    <div key={idx} className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">
                        Member {idx + 2} Registered Email or Registration ID *
                      </label>
                      <input
                        type="text"
                        required
                        className="form-input"
                        placeholder="email@college.edu or CS-XXXX"
                        value={val}
                        onChange={(e) => handleMemberIdentityChange(idx, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Created Banner */}
            {createdTeam && (
              <div
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1), rgba(0, 240, 255, 0.1))',
                  border: '1px solid rgba(52, 211, 153, 0.35)',
                  marginBottom: '24px',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: '#34d399', fontWeight: 800, fontSize: '1.2rem', marginBottom: '6px' }}>
                  Team Created Successfully!
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0 0 14px' }}>
                  Share this unique team code with your teammates:
                </p>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: '#040711',
                    border: '1px solid var(--border-cyan)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    color: 'var(--accent-cyan)',
                  }}
                >
                  <span>{createdTeam.team_code}</span>
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(createdTeam.team_code);
                      addToast({ title: 'Copied', message: 'Team code copied to clipboard.', type: 'info' });
                    }}
                    style={{ background: 'transparent', color: '#94a3b8' }}
                  >
                    <Copy size={18} />
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isCreating}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              {isCreating ? 'Validating & Creating Team...' : 'Create Team'}
            </button>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default TeamCreate;
