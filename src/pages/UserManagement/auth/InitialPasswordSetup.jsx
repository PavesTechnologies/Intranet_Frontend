import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../api/axiosInstance";
import { showStatusToast } from "../../../components/toastfy/toast";
import { useAuth } from "../../../contexts/AuthContext";

const EYE_CLOSED = 'M13.5 7s-2 3.5-5.5 3.5S2.5 7 2.5 7 4.5 3.5 8 3.5 13.5 7 13.5 7zM8 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM2 2l12 12';
const EYE_OPEN = 'M13.5 7s-2 3.5-5.5 3.5S2.5 7 2.5 7 4.5 3.5 8 3.5 13.5 7 13.5 7zM8 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4z';

function FloatingInput({ id, label, type = 'text', value, onChange, onKeyDown, error, autoComplete, hasSuffix, disabled, readOnly, children }) {
  const [focused, setFocused] = useState(false);

  const wrapClass = ['field-wrap', error ? 'errored' : focused ? 'focused' : 'default', disabled || readOnly ? 'disabled' : ''].join(' ');
  const labelClass = ['field-label', error ? 'err' : focused ? 'fc' : 'nfc'].join(' ');
  const inputClass = ['field-input', hasSuffix ? 'has-suffix' : ''].join(' ');

  return (
    <div style={{ width: '100%' }}>
      <div className={wrapClass}>
        <input
          id={id} name={id} type={type} value={value}
          onChange={onChange} onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={inputClass}
          placeholder=" "
        />
        <label htmlFor={id} className={labelClass}>{label}</label>
        {hasSuffix && (
          <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 2 }}>
            {children}
          </div>
        )}
      </div>
      {error && <p id={`${id}-err`} role="alert" className="err-msg">{error}</p>}
    </div>
  );
}

const customCSS = `
.setup-page-container {
  --neutral-950: #0C0A09;
  --neutral-800: #292524;
  --neutral-600: #57534E;
  --neutral-500: #78716C;
  --neutral-400: #A8A29E;
  --neutral-300: #C4C0BC;
  --neutral-200: #E7E5E4;
  --neutral-150: #F0EFED;
  --neutral-100: #F5F4F3;
  --neutral-50:  #FAFAF9;
  --accent-700: #1D40AF;
  --accent-600: #1B4ED8;
  --accent-100: #DBEAFE;
  --error-600: #DC2626;
  --success-600: #16A34A;
  --ff: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
 
  font-family: var(--ff);
  background: var(--neutral-100);
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
 
@keyframes fadeUp  { from { opacity:0; transform:translateY(10px)  } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn  { from { opacity:0 }                              to { opacity:1 } }
@keyframes slideUp { from { opacity:0; transform:translateY(4px) }  to { opacity:1; transform:translateY(0) } }
@keyframes shake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
@keyframes dot     { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-6px);opacity:1} }
 
.setup-page-container .a1 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 160ms both; }
.setup-page-container .a2 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 220ms both; }
.setup-page-container .a3 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 280ms both; }
.setup-page-container .a4 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 330ms both; }
.setup-page-container .a5 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 375ms both; }
.setup-page-container .a6 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 415ms both; }
 
.setup-page-container .shake { animation: shake 380ms cubic-bezier(0.4,0,0.2,1) both !important; }
 
.setup-page-container .btn-primary {
  width:100%; height:48px; background:var(--accent-600); color:#fff; border:none; border-radius:6px;
  display:flex; align-items:center; justify-content:center;
  font-size:14px; font-weight:600; font-family:var(--ff); letter-spacing:.01em;
  cursor:pointer;
  transition: transform 140ms cubic-bezier(.34,1.56,.64,1), box-shadow 140ms ease, background 120ms ease;
}
.setup-page-container .btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(27,78,216,.3); background:var(--accent-700); }
.setup-page-container .btn-primary:active:not(:disabled) { transform:translateY(0); box-shadow:none; }
.setup-page-container .btn-primary:disabled { opacity:.75; cursor:not-allowed; }
.setup-page-container .btn-primary:focus-visible { outline:2px solid var(--accent-600); outline-offset:2px; }

.setup-page-container .btn-secondary {
  width:100%; height:48px; background:#fff; color:var(--neutral-800); border:1px solid var(--neutral-300); border-radius:6px;
  display:flex; align-items:center; justify-content:center;
  font-size:14px; font-weight:600; font-family:var(--ff); letter-spacing:.01em;
  cursor:pointer;
  transition: background 140ms ease, border-color 140ms ease;
}
.setup-page-container .btn-secondary:hover:not(:disabled) { background:var(--neutral-50); border-color:var(--neutral-400); }
.setup-page-container .btn-secondary:disabled { opacity:.6; cursor:not-allowed; }
 
.setup-page-container .lnk { background:none; border:none; cursor:pointer; font-family:var(--ff); transition:color 120ms ease; padding:0; }
.setup-page-container .lnk:hover { color:var(--accent-600) !important; }
.setup-page-container .lnk:focus-visible { outline:2px solid var(--accent-600); outline-offset:2px; border-radius:2px; }
 
.setup-page-container .pw-btn { background:none; border:none; cursor:pointer; display:flex; align-items:center; padding:4px; color:var(--neutral-300); transition:color 120ms ease; }
.setup-page-container .pw-btn:hover { color:var(--neutral-500); }
 
.setup-page-container .dot { animation: dot 700ms ease-in-out infinite; }
.setup-page-container .dot:nth-child(2) { animation-delay: 145ms; }
.setup-page-container .dot:nth-child(3) { animation-delay: 290ms; }
 
.setup-page-container .field-wrap { position:relative; height:56px; border-radius:6px; background:#fff; transition:box-shadow 140ms cubic-bezier(0.4,0,0.2,1); }
.setup-page-container .field-wrap.focused  { box-shadow: inset 0 0 0 2px var(--accent-600); }
.setup-page-container .field-wrap.errored  { box-shadow: inset 0 0 0 2px var(--error-600); }
.setup-page-container .field-wrap.default  { box-shadow: inset 0 0 0 1px var(--neutral-200); }
.setup-page-container .field-wrap.disabled { background: var(--neutral-50); opacity: 0.8; }
.setup-page-container .field-wrap:not(.focused):not(.errored):not(.disabled):hover { box-shadow: inset 0 0 0 1px var(--neutral-400); }
 
.setup-page-container .field-label {
  position:absolute; left:14px; pointer-events:none; white-space:nowrap;
  font-size:15px; font-family:var(--ff); font-weight:400; line-height:1; z-index:1;
  transition: top 180ms cubic-bezier(0,0,0.2,1), transform 180ms cubic-bezier(0,0,0.2,1), color 140ms ease;
  transform-origin: left top;
  top:50%; transform:translateY(-50%) scale(1); color:var(--neutral-400);
}
 
.setup-page-container .field-input:focus ~ .field-label,
.setup-page-container .field-input:not(:placeholder-shown) ~ .field-label,
.setup-page-container .field-input:-webkit-autofill ~ .field-label {
  top:10px; transform:scale(0.775);
}
 
.setup-page-container .field-input:focus ~ .field-label.fc { color:var(--accent-600); }
.setup-page-container .field-input:not(:placeholder-shown) ~ .field-label.nfc { color:var(--neutral-400); }
.setup-page-container .field-input ~ .field-label.err { color:var(--error-600); }
 
.setup-page-container .field-input {
  position:absolute; inset:0; width:100%; height:100%;
  padding-left:14px; padding-right:14px; padding-bottom:0;
  font-size:15px; font-family:var(--ff); font-weight:400; color:var(--neutral-950);
  background:transparent; border:none; outline:none; border-radius:6px;
  transition:padding-top 180ms cubic-bezier(0,0,0.2,1);
  padding-top:2px;
}
.setup-page-container .field-input.has-suffix { padding-right:46px; }
 
.setup-page-container .field-input:focus,
.setup-page-container .field-input:not(:placeholder-shown),
.setup-page-container .field-input:-webkit-autofill {
  padding-top:18px;
}
 
.setup-page-container .err-msg { margin:5px 0 0; font-size:12px; color:var(--error-600); font-family:var(--ff); animation:slideUp 200ms cubic-bezier(0,0,0.2,1) both; }

.setup-page-container .card {
  position: relative;
  z-index: 10;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05);
  width: 100%;
  max-width: 440px;
  padding: 48px;
  border: 1px solid rgba(0,0,0,0.05);
}

.rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  transition: color 200ms ease;
}
.rule-item.met { color: var(--success-600); }
.rule-item.unmet { color: var(--neutral-400); }
.rule-item svg { flex-shrink: 0; }
`;

const InteractiveGrid = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const spacing = 25;
    const radius = 1.5;
    const dots = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      dots.length = 0;
      for (let x = 0; x < canvas.width; x += spacing) {
        for (let y = 0; y < canvas.height; y += spacing) {
          dots.push({ ox: x, oy: y, x: x, y: y });
        }
      }
    };
    window.addEventListener('resize', resize);
    resize();

    const parent = canvas.parentElement;
    const handleMouseMove = (e) => {
      const rect = parent.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    parent.addEventListener('mousemove', handleMouseMove);
    parent.addEventListener('mouseleave', handleMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const dx = dot.ox - mx;
        const dy = dot.oy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const maxDist = 140;
        if (dist < maxDist) {
          const force = (maxDist - dist) / maxDist;
          const r = Math.round(231 - (231 - 120) * force);
          const g = Math.round(229 - (229 - 113) * force);
          const b = Math.round(228 - (228 - 108) * force);
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

          const angle = Math.atan2(dy, dx);
          const targetX = dot.ox + Math.cos(angle) * force * 15;
          const targetY = dot.oy + Math.sin(angle) * force * 15;
          dot.x += (targetX - dot.x) * 0.2;
          dot.y += (targetY - dot.y) * 0.2;
        } else {
          ctx.fillStyle = '#E7E5E4';
          dot.x += (dot.ox - dot.x) * 0.1;
          dot.y += (dot.oy - dot.y) * 0.1;
        }

        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
};

export default function InitialPasswordSetup() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const email = user?.email || "";

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState(null);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const weights = ['400', '500', '600', '700'];
    weights.forEach(w => {
      if (!document.getElementById(`font-dm-sans-${w}`)) {
        const l = document.createElement('link');
        l.id = `font-dm-sans-${w}`;
        l.rel = 'stylesheet';
        l.href = `https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5/${w}.css`;
        document.head.appendChild(l);
      }
    });

    if (!email) {
      // showStatusToast("Session expired or email not found. Please login again.", "error");
      logout();
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          navigate("/", { replace: true });
        });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [email, logout, navigate]);

  const authHeader = {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };

  const passwordRules = {
    minLength: newPassword.length >= 8 && newPassword.length <= 12,
    firstCapital: /^[A-Z]/.test(newPassword),
    digit: /\d/.test(newPassword),
    specialChar: /[!@#$%^&*()_+\-=[\]{}|;':",.<>/?]/.test(newPassword),
    noSpaces: !/\s/.test(newPassword),
    notEasy: !/(password|123456|qwerty)/i.test(newPassword),
  };

  const allRulesSatisfied = Object.values(passwordRules).every(Boolean);

  const triggerShake = (field) => {
    setShake(field);
    setTimeout(() => setShake(null), 450);
  };

  const handleSendOtp = async () => {
    if (!email) return;

    setLoading(true);
    try {
      await api.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/send-otp`,
        { email },
      );
      setOtpSent(true);
      showStatusToast("OTP sent to your email. Check inbox/spam.", "success");
    } catch (err) {
      console.error("Send OTP Error:", err);
      showStatusToast(
        "Failed to send OTP: " + (err.response?.data?.detail || err.message),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setErrors({ otp: "OTP is required" });
      triggerShake('otp');
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      await api.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/validate-otp`,
        {
          email,
          otp: otp.trim(),
        },
      );
      setOtpVerified(true);
      showStatusToast("OTP verified successfully!", "success");
    } catch (err) {
      console.error("OTP Verify Error:", err);
      showStatusToast(
        "OTP verification failed: " +
          (err.response?.data?.detail || err.message),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async () => {
    const errs = {};
    if (!newPassword.trim()) errs.newPassword = "New password is required";
    if (!confirmPassword.trim()) errs.confirmPassword = "Confirm your password";
    
    if (Object.keys(errs).length) {
      setErrors(errs);
      triggerShake(errs.newPassword ? 'newPassword' : 'confirmPassword');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirmPassword: "Passwords do not match" });
      triggerShake('confirmPassword');
      return;
    }
    if (!allRulesSatisfied) {
      showStatusToast("Please satisfy all password requirements.", "error");
      triggerShake('rules');
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      await api.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/first-login/change-password`,
        {
          email,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
        authHeader,
      );

      showStatusToast(
        "Password set successfully! Please login again.",
        "success",
      );
      logout();
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          navigate("/", { replace: true });
        });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("Set Password Error:", err);
      showStatusToast(
        "Error setting password: " +
          (err.response?.data?.detail || err.message),
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  const onOtpKey = (e) => { if (e.key === 'Enter' && !loading) handleVerifyOtp(); };
  const onPassKey = (e) => { if (e.key === 'Enter' && !loading && allRulesSatisfied) handleSetPassword(); };

  const RuleIcon = ({ met }) => (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {met ? <path d="M13.5 4.5l-7 7-3.5-3.5" /> : <circle cx={8} cy={8} r={6} strokeWidth={1.5} />}
    </svg>
  );

  if (!email) return null;

  return (
    <div className="setup-page-container">
      <style>{customCSS}</style>
      <InteractiveGrid />

      <div className="card">
        {/* Header */}
        <div className="a1" style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '12px', background: 'var(--neutral-100)', marginBottom: '16px' }}>
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--neutral-800)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--neutral-950)', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
            Activate account
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--neutral-500)', margin: 0, lineHeight: 1.5 }}>
            {!otpVerified ? "Verify your email to continue." : "Set a secure password for your workspace."}
          </p>
        </div>

        {/* State 1 & 2: OTP Flow */}
        {!otpVerified ? (
          <>
            <div className="a2" style={{ marginBottom: '16px' }}>
              <FloatingInput
                id="email" label="Email address" type="email"
                value={email}
                readOnly={true}
              />
            </div>

            {!otpSent ? (
              <div className="a3" style={{ marginTop: '24px' }}>
                <button
                  type="button" className="btn-primary"
                  onClick={handleSendOtp} disabled={loading}
                >
                  {loading
                    ? <div style={{ display: 'flex', gap: '5px' }}>
                        {[0, 1, 2].map(i => <div key={i} className="dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,.85)', animationDelay: `${i * 145}ms` }} />)}
                      </div>
                    : 'Send Verification Code'
                  }
                </button>
              </div>
            ) : (
              <>
                <div className={`a3${shake === 'otp' ? ' shake' : ''}`} style={{ marginBottom: '24px' }}>
                  <FloatingInput
                    id="otp" label="Verification code" type="text"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value); setErrors(p => ({ ...p, otp: '' })); }}
                    onKeyDown={onOtpKey}
                    error={errors.otp}
                    autoComplete="off"
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                    <button type="button" className="lnk" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--neutral-400)' }} onClick={handleSendOtp} disabled={loading}>
                      Didn't receive code? Resend
                    </button>
                  </div>
                </div>

                <div className="a4">
                  <button
                    type="button" className="btn-primary"
                    onClick={handleVerifyOtp} disabled={loading}
                  >
                    {loading
                      ? <div style={{ display: 'flex', gap: '5px' }}>
                          {[0, 1, 2].map(i => <div key={i} className="dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,.85)', animationDelay: `${i * 145}ms` }} />)}
                        </div>
                      : 'Verify Code'
                    }
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          /* State 3: Password Setup */
          <>
            <div className={`a2${shake === 'newPassword' ? ' shake' : ''}`} style={{ marginBottom: '16px' }}>
              <FloatingInput
                id="newPassword" label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setErrors(p => ({ ...p, newPassword: '' })); }}
                onKeyDown={onPassKey}
                error={errors.newPassword}
                autoComplete="new-password"
                hasSuffix={true}
              >
                <button
                  type="button" className="pw-btn" tabIndex={-1}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowNewPassword(v => !v)}
                >
                  <svg width={17} height={17} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d={showNewPassword ? EYE_OPEN : EYE_CLOSED} />
                  </svg>
                </button>
              </FloatingInput>
            </div>

            <div className={`a3${shake === 'confirmPassword' ? ' shake' : ''}`} style={{ marginBottom: '24px' }}>
              <FloatingInput
                id="confirmPassword" label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setErrors(p => ({ ...p, confirmPassword: '' })); }}
                onKeyDown={onPassKey}
                error={errors.confirmPassword}
                autoComplete="new-password"
                hasSuffix={true}
              >
                <button
                  type="button" className="pw-btn" tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirmPassword(v => !v)}
                >
                  <svg width={17} height={17} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d={showConfirmPassword ? EYE_OPEN : EYE_CLOSED} />
                  </svg>
                </button>
              </FloatingInput>
            </div>

            {/* Password Rules Checklist */}
            <div className={`a4${shake === 'rules' ? ' shake' : ''}`} style={{ background: 'var(--neutral-50)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--neutral-800)', marginBottom: '10px' }}>Password requirements:</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div className={`rule-item ${passwordRules.minLength ? 'met' : 'unmet'}`}><RuleIcon met={passwordRules.minLength}/> 8-12 chars</div>
                <div className={`rule-item ${passwordRules.firstCapital ? 'met' : 'unmet'}`}><RuleIcon met={passwordRules.firstCapital}/> First uppercase</div>
                <div className={`rule-item ${passwordRules.digit ? 'met' : 'unmet'}`}><RuleIcon met={passwordRules.digit}/> One digit</div>
                <div className={`rule-item ${passwordRules.specialChar ? 'met' : 'unmet'}`}><RuleIcon met={passwordRules.specialChar}/> One special char</div>
                <div className={`rule-item ${passwordRules.noSpaces ? 'met' : 'unmet'}`}><RuleIcon met={passwordRules.noSpaces}/> No spaces</div>
                <div className={`rule-item ${passwordRules.notEasy ? 'met' : 'unmet'}`}><RuleIcon met={passwordRules.notEasy}/> Not common</div>
              </div>
            </div>

            <div className="a5">
              <button
                type="button" className="btn-primary"
                onClick={handleSetPassword} disabled={loading || (newPassword && !allRulesSatisfied)}
              >
                {loading
                  ? <div style={{ display: 'flex', gap: '5px' }}>
                      {[0, 1, 2].map(i => <div key={i} className="dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(255,255,255,.85)', animationDelay: `${i * 145}ms` }} />)}
                    </div>
                  : 'Set Password'
                }
              </button>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="a6" style={{ marginTop: '32px', textAlign: 'center', borderTop: '1px solid var(--neutral-150)', paddingTop: '20px' }}>
          <button 
            type="button" className="lnk" 
            style={{ fontSize: '13px', fontWeight: 500, color: 'var(--neutral-400)' }} 
            onClick={() => {
              logout();
              if (document.startViewTransition) {
                document.startViewTransition(() => {
                  navigate("/", { replace: true });
                });
              } else {
                navigate("/", { replace: true });
              }
            }}
            disabled={loading}
          >
            ← Cancel and return to login
          </button>
        </div>
      </div>
    </div>
  );
}
