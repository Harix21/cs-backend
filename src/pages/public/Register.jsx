import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { Footer } from '../../components/common/Footer';
import { useToast } from '../../context/ToastContext';
import {
  getRegistrationFees,
  getSpecialEvents,
  submitRegistration,
} from '../../services/registrationService';
import { formatCurrency } from '../../utils/helpers';
import confetti from 'canvas-confetti';
import {
  Calendar,
  CreditCard,
  Upload,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  QrCode,
} from 'lucide-react';

export function Register() {
  const { addToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    college: '',
    department: '',
    year: '',
    utr: '',
  });

  const [selectedDay, setSelectedDay] = useState('');
  const [selectedSpecialEvents, setSelectedSpecialEvents] = useState([]);
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');

  const [fees, setFees] = useState({ DAY_1: 0, DAY_2: 0 });
  const [specialEvents, setSpecialEvents] = useState([]);
  const [isLoadingFees, setIsLoadingFees] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const [feeData, events] = await Promise.all([
          getRegistrationFees().catch(() => ({ DAY_1: 250, DAY_2: 250 })),
          getSpecialEvents().catch(() => []),
        ]);
        setFees(feeData);
        setSpecialEvents(events);
      } catch (err) {
        console.error('Failed to load fees or events:', err);
      } finally {
        setIsLoadingFees(false);
      }
    }
    loadConfig();
  }, []);

  // Compute calculated fee
  const calculatedFee = (() => {
    if (!selectedDay) return 0;
    if (selectedDay === 'DAY_1') return fees.DAY_1;
    if (selectedDay === 'DAY_2') return fees.DAY_2;
    if (selectedDay === 'BOTH') return fees.DAY_1 + fees.DAY_2;
    if (selectedDay === 'SPECIAL') {
      return selectedSpecialEvents.reduce((sum, code) => {
        const evt = specialEvents.find((e) => e.code === code);
        return sum + Number(evt?.fee || 0);
      }, 0);
    }
    return 0;
  })();

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast({
        title: 'File Too Large',
        message: 'Payment screenshot must be 5 MB or smaller.',
        type: 'error',
      });
      return;
    }

    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function toggleSpecialEvent(code) {
    setSelectedSpecialEvents((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedDay) {
      addToast({
        title: 'Day Required',
        message: 'Please choose Day 1, Day 2, Both Days, or Special Events.',
        type: 'error',
      });
      return;
    }

    if (selectedDay === 'SPECIAL' && !selectedSpecialEvents.length) {
      addToast({
        title: 'Special Event Required',
        message: 'Please select at least one special event to register.',
        type: 'error',
      });
      return;
    }

    if (!screenshotFile) {
      addToast({
        title: 'Proof Required',
        message: 'Please upload your UPI payment screenshot proof.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitRegistration({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        college: formData.college,
        department: formData.department,
        year: formData.year,
        selectedDay,
        specialEventCodes: selectedSpecialEvents,
        utr: formData.utr,
        paymentScreenshotFile: screenshotFile,
      });

      // Save locally for quick lookup
      localStorage.setItem(
        'cs_last_registration',
        JSON.stringify({
          code: result.registration_code,
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        })
      );

      setSubmittedResult(result);

      // Trigger Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00f0ff', '#38bdf8', '#818cf8', '#a855f7'],
      });

      addToast({
        title: 'Registration Submitted!',
        message: `Your Registration ID is ${result.registration_code}. Status: Under Review.`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Submission Error',
        message: err.message || 'Failed to submit registration. Please verify details.',
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, width: 'min(900px, calc(100% - 36px))', margin: '40px auto 0' }}>
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid var(--border-cyan)',
              color: 'var(--accent-cyan)',
              fontSize: '0.78rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            PARTICIPANT REGISTRATION PORTAL
          </div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', marginBottom: '8px' }}>
            Register for <span className="gradient-text-cyan">Cyber Sentinel 2K26</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Select your symposium day, submit official UPI payment proof, and receive your verified entry QR pass.
          </p>
        </div>

        {/* If submitted, show success result card */}
        {submittedResult ? (
          <div className="glass-card" style={{ padding: '36px', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(52, 211, 153, 0.15)',
                color: '#34d399',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 20px',
                border: '1px solid rgba(52, 211, 153, 0.3)',
              }}
            >
              <CheckCircle size={36} />
            </div>

            <h2 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Registration Submitted!</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto 24px' }}>
              Your registration is currently <strong style={{ color: '#fbbf24' }}>UNDER REVIEW</strong>. 
              Our admin team will verify your UTR and payment screenshot shortly.
            </p>

            <div
              style={{
                background: 'rgba(6, 12, 26, 0.6)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '20px',
                maxWidth: '420px',
                margin: '0 auto 28px',
                textAlign: 'left',
              }}
            >
              <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                Your Registration ID
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1.6rem',
                  fontWeight: 800,
                  color: 'var(--accent-cyan)',
                  letterSpacing: '0.05em',
                  margin: '4px 0 12px',
                }}
              >
                {submittedResult.registration_code}
              </div>
              <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                Registered Name
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formData.name}</div>
            </div>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/check" className="btn btn-primary">
                <QrCode size={18} /> Check Verification & QR Pass
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmittedResult(null);
                  setFormData({
                    name: '',
                    email: '',
                    phone: '',
                    college: '',
                    department: '',
                    year: '',
                    utr: '',
                  });
                  setSelectedDay('');
                  setSelectedSpecialEvents([]);
                  setScreenshotFile(null);
                  setScreenshotPreview('');
                }}
                className="btn btn-secondary"
              >
                Register Another Participant
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '32px' }}>
            {/* Step 1: Personal Details */}
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-info">1</span> Participant Information
              </h3>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    className="form-input"
                    placeholder="e.g. Alex Henderson"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="form-input"
                    placeholder="alex@college.edu"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    className="form-input"
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">College / University *</label>
                  <input
                    type="text"
                    name="college"
                    required
                    className="form-input"
                    placeholder="Institution Name"
                    value={formData.college}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <input
                    type="text"
                    name="department"
                    required
                    className="form-input"
                    placeholder="e.g. Computer Science & Engineering"
                    value={formData.department}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Year of Study</label>
                  <select
                    name="year"
                    className="form-select"
                    value={formData.year}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Year</option>
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Step 2: Symposium Day Selection */}
            <div style={{ marginBottom: '32px', borderTop: '1px solid var(--border-light)', paddingTop: '28px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-info">2</span> Select Registration Day
              </h3>

              <div className="grid-4" style={{ marginBottom: '20px' }}>
                {[
                  { id: 'DAY_1', title: 'Day 1', desc: 'Technical Events', fee: fees.DAY_1 },
                  { id: 'DAY_2', title: 'Day 2', desc: 'Non-Technical Events', fee: fees.DAY_2 },
                  { id: 'BOTH', title: 'Both Days', desc: 'Technical + Non-Tech', fee: fees.DAY_1 + fees.DAY_2 },
                  { id: 'SPECIAL', title: 'Special Events', desc: 'Premium Flagships', fee: null },
                ].map((opt) => (
                  <div
                    key={opt.id}
                    onClick={() => setSelectedDay(opt.id)}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      background: selectedDay === opt.id ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      border: selectedDay === opt.id ? '2px solid var(--accent-cyan)' : '1px solid var(--border-light)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: selectedDay === opt.id ? 'var(--accent-cyan)' : 'var(--text-main)' }}>
                      {opt.title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', margin: '4px 0 8px' }}>
                      {opt.desc}
                    </div>
                    <div style={{ fontWeight: 700, color: '#38bdf8', fontSize: '0.95rem' }}>
                      {opt.fee !== null ? formatCurrency(opt.fee) : 'A la carte'}
                    </div>
                  </div>
                ))}
              </div>

              {/* Special Events Checkboxes if SPECIAL selected */}
              {selectedDay === 'SPECIAL' && (
                <div
                  style={{
                    background: 'rgba(6, 12, 26, 0.5)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    border: '1px solid var(--border-cyan)',
                    marginBottom: '20px',
                  }}
                >
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--accent-cyan)', marginBottom: '12px' }}>
                    Select Special Event(s)
                  </h4>
                  {specialEvents.length ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {specialEvents.map((evt) => {
                        const isChecked = selectedSpecialEvents.includes(evt.code);
                        return (
                          <label
                            key={evt.id || evt.code}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '12px 16px',
                              background: isChecked ? 'rgba(0, 240, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                              border: isChecked ? '1px solid var(--accent-cyan)' : '1px solid var(--border-light)',
                              borderRadius: 'var(--radius-sm)',
                              cursor: 'pointer',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSpecialEvent(evt.code)}
                                style={{ transform: 'scale(1.2)', accentColor: 'var(--accent-cyan)' }}
                              />
                              <div>
                                <strong style={{ color: 'var(--text-main)' }}>
                                  {evt.code} • {evt.name}
                                </strong>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                  {evt.description || 'Premium special event'}
                                </div>
                              </div>
                            </div>
                            <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                              {formatCurrency(evt.fee)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                      No special events configured currently.
                    </div>
                  )}
                </div>
              )}

              {/* Fee summary banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    Calculated Registration Fee
                  </div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    {selectedDay ? formatCurrency(calculatedFee) : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <div>Official UPI QR Payment</div>
                  <div style={{ color: '#34d399', fontWeight: 600 }}>Pass Issued Upon Verification</div>
                </div>
              </div>
            </div>

            {/* Step 3: Payment & Proof */}
            <div style={{ marginBottom: '32px', borderTop: '1px solid var(--border-light)', paddingTop: '28px' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-info">3</span> Payment & Verification
              </h3>

              <div className="grid-2">
                {/* Official QR box */}
                <div
                  style={{
                    background: 'rgba(6, 12, 26, 0.5)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
                    OFFICIAL COLLEGE UPI QR CODE
                  </div>
                  <div
                    style={{
                      width: '150px',
                      height: '150px',
                      borderRadius: '12px',
                      background: '#ffffff',
                      display: 'grid',
                      placeItems: 'center',
                      padding: '10px',
                      marginBottom: '12px',
                    }}
                  >
                    {/* Simulated High-tech College QR */}
                    <div
                      style={{
                        width: '130px',
                        height: '130px',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cpath d='M10 10h30v30h-30z M20 20h10v10h-10z M60 10h30v30h-30z M70 20h10v10h-10z M10 60h30v30h-30z M20 70h10v10h-10z M50 15h5v15h-5z M50 50h15v5h-15z M70 60h20v5h-20z M60 75h10v15h-10z M80 80h10v10h-10z' fill='%230b1329'/%3E%3C/svg%3E")`,
                        backgroundSize: 'contain',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'center',
                      }}
                    ></div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Scan with GPay, PhonePe, or Paytm
                  </div>
                </div>

                {/* UTR & Screenshot */}
                <div>
                  <div className="form-group">
                    <label className="form-label">UTR / UPI Transaction ID *</label>
                    <input
                      type="text"
                      name="utr"
                      required
                      className="form-input"
                      placeholder="12-digit transaction ID"
                      value={formData.utr}
                      onChange={handleInputChange}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Enter the exact 12-digit UTR from your payment receipt.
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Screenshot Proof *</label>
                    <input
                      type="file"
                      accept="image/*"
                      required
                      className="form-input"
                      onChange={handleFileChange}
                    />
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      PNG, JPG or WEBP up to 5 MB.
                    </div>

                    {screenshotPreview && (
                      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={screenshotPreview}
                          alt="Preview"
                          style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: '1px solid var(--border-cyan)',
                          }}
                        />
                        <span style={{ fontSize: '0.82rem', color: '#34d399' }}>Screenshot attached</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                borderTop: '1px solid var(--border-light)',
                paddingTop: '24px',
              }}
            >
              <Link to="/check" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                Already registered? Check Status →
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ padding: '12px 28px', fontSize: '1rem' }}
              >
                {isSubmitting ? 'Submitting Registration...' : 'Complete Registration'}
              </button>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default Register;
