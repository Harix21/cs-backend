import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { useToast } from '../../context/ToastContext';
import { callTeamManagement } from '../../services/registrationService';
import { StatusBadge } from '../../components/ui/StatusBadge';
import {
  UserCheck2,
  CheckCircle2,
  Search,
  ArrowRight,
  ShieldCheck,
  Users,
} from 'lucide-react';

export function TeamJoin() {
  const { addToast } = useToast();

  const [memberIdentity, setMemberIdentity] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedMember, setVerifiedMember] = useState(null);
  const [packages, setPackages] = useState({ DAY_1: [], DAY_2: [] });

  const [teamDay, setTeamDay] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableTeams, setAvailableTeams] = useState([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  const [teamCode, setTeamCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  async function handleVerifyMember(e) {
    e.preventDefault();
    if (!memberIdentity.trim()) {
      addToast({ title: 'Input Required', message: 'Enter your registered email or Registration ID.', type: 'error' });
      return;
    }

    setIsVerifying(true);
    setVerifiedMember(null);
    setAvailableTeams([]);

    try {
      const data = await callTeamManagement({
        action: 'verify',
        identity: memberIdentity.trim(),
      });

      setVerifiedMember(data.registration);
      setPackages(data.packages || { DAY_1: [], DAY_2: [] });

      if (data.registration.selected_day !== 'BOTH') {
        setTeamDay(data.registration.selected_day);
      }

      addToast({
        title: 'Account Verified',
        message: `Welcome, ${data.registration.participant_name}. Choose a package to find your team.`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Verification Failed',
        message: err.message || 'Unable to verify member.',
        type: 'error',
      });
    } finally {
      setIsVerifying(false);
    }
  }

  const currentPackages = packages[teamDay] || [];
  const activePackage = currentPackages.find((p) => p.id === selectedPackageId);

  // Load available teams for selected day & package
  useEffect(() => {
    async function fetchTeams() {
      if (!verifiedMember || !teamDay || !selectedPackageId) {
        setAvailableTeams([]);
        return;
      }

      setIsLoadingTeams(true);
      try {
        const data = await callTeamManagement({
          action: 'list',
          identity: memberIdentity.trim(),
          day: teamDay,
          package_id: selectedPackageId,
          search: searchQuery.trim(),
        });
        setAvailableTeams(data.teams || []);
      } catch (err) {
        console.error('Failed to load teams:', err);
      } finally {
        setIsLoadingTeams(false);
      }
    }

    fetchTeams();
  }, [verifiedMember, teamDay, selectedPackageId, searchQuery, memberIdentity]);

  async function handleJoinTeam(e) {
    e.preventDefault();
    if (!teamCode.trim()) {
      addToast({ title: 'Code Required', message: 'Please enter a valid team code.', type: 'error' });
      return;
    }

    setIsJoining(true);

    try {
      const data = await callTeamManagement({
        action: 'join',
        identity: memberIdentity.trim(),
        day: teamDay,
        package_id: selectedPackageId,
        team_code: teamCode.trim().toUpperCase(),
      });

      addToast({
        title: 'Joined Successfully!',
        message: data.message || 'You have successfully joined the team!',
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Join Failed',
        message: err.message || 'Unable to join team. Check if team is full or code is invalid.',
        type: 'error',
      });
    } finally {
      setIsJoining(false);
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
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            TEAM MATCHMAKING
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: '8px' }}>
            Join an <span className="gradient-text-cyan">Existing Team</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Verify your registration, select your event package, find your team, and join using your leader’s team code.
          </p>
        </div>

        {/* Step 1: Member Verification */}
        <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-info">1</span> Verify Your Account
          </h3>

          <form onSubmit={handleVerifyMember} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <input
              type="text"
              required
              className="form-input"
              style={{ flex: 1, minWidth: '240px' }}
              placeholder="Registered email or Registration ID (e.g. CS-1042)"
              value={memberIdentity}
              onChange={(e) => setMemberIdentity(e.target.value)}
            />
            <button type="submit" disabled={isVerifying} className="btn btn-primary">
              {isVerifying ? 'Verifying...' : 'Verify Member'}
            </button>
          </form>

          {verifiedMember && (
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
                <strong>{verifiedMember.participant_name}</strong> • Registration:{' '}
                {verifiedMember.registration_code} • Payment Verified
              </span>
            </div>
          )}
        </div>

        {/* Step 2: Browse and Join Form */}
        {verifiedMember && (
          <div className="glass-card" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-info">2</span> Find & Join Team
            </h3>

            <div className="grid-2" style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Symposium Day *</label>
                <select
                  required
                  className="form-select"
                  value={teamDay}
                  onChange={(e) => {
                    setTeamDay(e.target.value);
                    setSelectedPackageId('');
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
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  disabled={!teamDay}
                >
                  <option value="">{teamDay ? 'Select a Package' : 'Select a day first'}</option>
                  {currentPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.events.map((e) => e.name).join(' + ')} • {pkg.size} members
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Teams */}
            {selectedPackageId && (
              <div style={{ marginBottom: '24px' }}>
                <label className="form-label">Search Open Teams</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search team name, code, or leader..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ marginBottom: '14px' }}
                />

                {isLoadingTeams ? (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.88rem' }}>Loading teams...</div>
                ) : availableTeams.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {availableTeams.map((team) => (
                      <div
                        key={team.id || team.team_code}
                        onClick={() => setTeamCode(team.team_code)}
                        style={{
                          padding: '14px 18px',
                          borderRadius: 'var(--radius-md)',
                          background: teamCode === team.team_code ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          border: teamCode === team.team_code ? '1px solid var(--accent-cyan)' : '1px solid var(--border-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{team.team_name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                            Code: <strong style={{ color: 'var(--accent-cyan)' }}>{team.team_code}</strong> • Leader: {team.leader_name}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {team.member_count} / {team.max_members}
                          </span>
                          <StatusBadge status={team.full ? 'FULL' : 'OPEN'} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                    No teams found for this package. You can also type the code directly below.
                  </div>
                )}
              </div>
            )}

            {/* Team Code Submit Form */}
            <form onSubmit={handleJoinTeam} style={{ borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
              <div className="form-group">
                <label className="form-label">Team Code *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. TEAM-DAY-XXXXXXXX"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', letterSpacing: '0.05em' }}
                />
              </div>

              <button
                type="submit"
                disabled={isJoining || !teamCode.trim()}
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                {isJoining ? 'Joining Team...' : 'Join Team'}
              </button>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default TeamJoin;
