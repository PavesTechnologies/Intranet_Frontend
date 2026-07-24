// src/pages/LoginPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
import { useWebSocket } from "./leave_management/websockets/WebSocketProvider";
import { showStatusToast } from "../components/toastfy/toast";

// ─── SVG Icons ────────────────────────────────────────────────────
const MS_LOGO = () => (
  <svg width={18} height={18} viewBox="0 0 18 18" aria-hidden="true">
    <rect x={0.5} y={0.5} width={8} height={8} fill="#F25022" />
    <rect x={9.5} y={0.5} width={8} height={8} fill="#7FBA00" />
    <rect x={0.5} y={9.5} width={8} height={8} fill="#00A4EF" />
    <rect x={9.5} y={9.5} width={8} height={8} fill="#FFB900" />
  </svg>
);

const SERVICES = [
  { label: "Dashboard", d: "M3 3h5v5H3zM9 3h5v5H9zM3 9h5v5H3zM9 9h5v5H9z" },
  { label: "Leave", d: "M3 6h10M3 10h10M8 3v10M5 3a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V3z" },
  { label: "Timesheets", d: "M12 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0zM7 5v3l2 1" },
  { label: "Projects", d: "M3 5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5zM9 5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V5zM3 11a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3z" },
  { label: "Resources", d: "M5 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0zM2 14a5 5 0 0 1 10 0M13 5a2 2 0 0 1 0 4M16 14a4 4 0 0 0-4-4" },
  { label: "Onboarding", d: "M4 5h1v2H4V5zM4 9h1v2H4V9zM7 5h6M7 9h6M2 3a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3z" },
];

function SvcIcon({ d }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="#57534E" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// ─── Floating label input ─────────────────────────────────────────
function FloatingInput({ id, label, type = "text", value, onChange, onKeyDown, error, autoComplete, hasSuffix, children }) {
  const [focused, setFocused] = useState(false);
  const wrapClass = ["field-wrap", error ? "errored" : focused ? "focused" : "default"].join(" ");
  const labelClass = ["field-label", error ? "err" : focused ? "fc" : "nfc"].join(" ");
  const inputClass = ["field-input", hasSuffix ? "has-suffix" : ""].join(" ");

  return (
    <div>
      <div className={wrapClass}>
        <input
          id={id} name={id} type={type} value={value}
          onChange={onChange} onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
          className={inputClass}
          placeholder=" "
        />
        <label htmlFor={id} className={labelClass}>{label}</label>
        {hasSuffix && (
          <div style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
            {children}
          </div>
        )}
      </div>
      {error && <p id={`${id}-err`} role="alert" className="err-msg">{error}</p>}
    </div>
  );
}

// ─── Loading dots ─────────────────────────────────────────────────
function Dots() {
  return (
    <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className="dot" style={{ width: "5px", height: "5px", borderRadius: "50%", background: "rgba(255,255,255,.85)", animationDelay: `${i * 145}ms` }} />
      ))}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const customCSS = `
.login-page-container {
  --neutral-950: #0C0A09; --neutral-800: #292524; --neutral-600: #57534E;
  --neutral-500: #78716C; --neutral-400: #A8A29E; --neutral-300: #C4C0BC;
  --neutral-200: #E7E5E4; --neutral-150: #F0EFED; --neutral-100: #F5F4F3;
  --neutral-50:  #FAFAF9; --accent-700: #1D40AF;  --accent-600: #1B4ED8;
  --accent-100: #DBEAFE;  --error-600: #DC2626;   --error-50: #FFF5F5;
  --ff: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-family: var(--ff); background: var(--neutral-100);
}
@keyframes panelL  { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
@keyframes panelR  { from{opacity:0;transform:translateX(20px)}  to{opacity:1;transform:translateX(0)} }
@keyframes fadeUp  { from{opacity:0;transform:translateY(10px)}  to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn  { from{opacity:0} to{opacity:1} }
@keyframes slideUp { from{opacity:0;transform:translateY(4px)}   to{opacity:1;transform:translateY(0)} }
@keyframes shake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
@keyframes dot     { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-6px);opacity:1} }
@keyframes svcIn   { from{opacity:0;transform:translateY(6px)} to{opacity:.55;transform:translateY(0)} }
.login-page-container .panel-l { animation: panelL 420ms cubic-bezier(0,0,0.2,1) both; }
.login-page-container .panel-r { animation: panelR 420ms cubic-bezier(0,0,0.2,1) 80ms both; }
.login-page-container .a1{animation:fadeUp 300ms cubic-bezier(0,0,0.2,1) 160ms both}
.login-page-container .a2{animation:fadeUp 300ms cubic-bezier(0,0,0.2,1) 220ms both}
.login-page-container .a3{animation:fadeIn 260ms ease 275ms both}
.login-page-container .a4{animation:fadeUp 300ms cubic-bezier(0,0,0.2,1) 280ms both}
.login-page-container .a5{animation:fadeUp 300ms cubic-bezier(0,0,0.2,1) 330ms both}
.login-page-container .a6{animation:fadeUp 300ms cubic-bezier(0,0,0.2,1) 375ms both}
.login-page-container .a7{animation:fadeUp 300ms cubic-bezier(0,0,0.2,1) 415ms both}
.login-page-container .a8{animation:fadeUp 300ms cubic-bezier(0,0,0.2,1) 450ms both}
.login-page-container .svc-item{animation:svcIn 350ms cubic-bezier(0,0,0.2,1) both}
.login-page-container .svc-item:nth-child(1){animation-delay:550ms}
.login-page-container .svc-item:nth-child(2){animation-delay:600ms}
.login-page-container .svc-item:nth-child(3){animation-delay:645ms}
.login-page-container .svc-item:nth-child(4){animation-delay:685ms}
.login-page-container .svc-item:nth-child(5){animation-delay:720ms}
.login-page-container .svc-item:nth-child(6){animation-delay:750ms}
.login-page-container .svc-item:hover{transform:translateY(-2px) !important;opacity:1 !important}
.login-page-container .svc-item{transition:transform 150ms cubic-bezier(.34,1.56,.64,1),opacity 150ms ease;cursor:default}
.login-page-container .shake{animation:shake 380ms cubic-bezier(0.4,0,0.2,1) both !important}
.login-page-container .btn-ms{width:100%;height:48px;background:#2F2F2F;color:#fff;border:none;border-radius:6px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:14px;font-weight:500;font-family:var(--ff);letter-spacing:.005em;cursor:pointer;transition:transform 140ms cubic-bezier(.34,1.56,.64,1),box-shadow 140ms ease,background 120ms ease}
.login-page-container .btn-ms:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 5px 18px rgba(0,0,0,.22);background:#1A1A1A}
.login-page-container .btn-ms:active:not(:disabled){transform:translateY(0);box-shadow:none}
.login-page-container .btn-ms:disabled{opacity:.6;cursor:not-allowed}
.login-page-container .btn-ms:focus-visible{outline:2px solid var(--accent-600);outline-offset:2px}
.login-page-container .btn-primary{width:100%;height:48px;background:var(--accent-600);color:#fff;border:none;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;font-family:var(--ff);letter-spacing:.01em;cursor:pointer;transition:transform 140ms cubic-bezier(.34,1.56,.64,1),box-shadow 140ms ease,background 120ms ease}
.login-page-container .btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(27,78,216,.3);background:var(--accent-700)}
.login-page-container .btn-primary:active:not(:disabled){transform:translateY(0);box-shadow:none}
.login-page-container .btn-primary:disabled{opacity:.75;cursor:not-allowed}
.login-page-container .btn-primary:focus-visible{outline:2px solid var(--accent-600);outline-offset:2px}
.login-page-container .lnk{background:none;border:none;cursor:pointer;font-family:var(--ff);transition:color 120ms ease;padding:0}
.login-page-container .lnk:hover{color:var(--accent-600) !important}
.login-page-container .lnk:focus-visible{outline:2px solid var(--accent-600);outline-offset:2px;border-radius:2px}
.login-page-container .pw-btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;padding:4px;color:var(--neutral-300);transition:color 120ms ease}
.login-page-container .pw-btn:hover{color:var(--neutral-500)}
.login-page-container .dot{animation:dot 700ms ease-in-out infinite}
.login-page-container .dot:nth-child(2){animation-delay:145ms}
.login-page-container .dot:nth-child(3){animation-delay:290ms}
.login-page-container .field-wrap{position:relative;height:56px;border-radius:6px;background:#fff;transition:box-shadow 140ms cubic-bezier(0.4,0,0.2,1)}
.login-page-container .field-wrap.focused{box-shadow:inset 0 0 0 2px var(--accent-600)}
.login-page-container .field-wrap.errored{box-shadow:inset 0 0 0 2px var(--error-600)}
.login-page-container .field-wrap.default{box-shadow:inset 0 0 0 1px var(--neutral-200)}
.login-page-container .field-wrap:not(.focused):not(.errored):hover{box-shadow:inset 0 0 0 1px var(--neutral-400)}
.login-page-container .field-label{position:absolute;left:14px;pointer-events:none;white-space:nowrap;font-size:15px;font-family:var(--ff);font-weight:400;line-height:1;z-index:1;transition:top 180ms cubic-bezier(0,0,0.2,1),transform 180ms cubic-bezier(0,0,0.2,1),color 140ms ease;transform-origin:left top;top:50%;transform:translateY(-50%) scale(1);color:var(--neutral-400)}
.login-page-container .field-input:focus ~ .field-label,
.login-page-container .field-input:not(:placeholder-shown) ~ .field-label,
.login-page-container .field-input:-webkit-autofill ~ .field-label{top:10px;transform:scale(0.775)}
.login-page-container .field-input:focus ~ .field-label.fc{color:var(--accent-600)}
.login-page-container .field-input:not(:placeholder-shown) ~ .field-label.nfc{color:var(--neutral-400)}
.login-page-container .field-input ~ .field-label.err{color:var(--error-600)}
.login-page-container .field-input{position:absolute;inset:0;width:100%;height:100%;padding-left:14px;padding-right:14px;padding-bottom:0;font-size:15px;font-family:var(--ff);font-weight:400;color:var(--neutral-950);background:transparent;border:none;outline:none;border-radius:6px;transition:padding-top 180ms cubic-bezier(0,0,0.2,1);padding-top:2px}
.login-page-container .field-input.has-suffix{padding-right:46px}
.login-page-container .field-input:focus,
.login-page-container .field-input:not(:placeholder-shown),
.login-page-container .field-input:-webkit-autofill{padding-top:18px}
.login-page-container .err-msg{margin:5px 0 0;font-size:12px;color:var(--error-600);font-family:var(--ff);animation:slideUp 200ms cubic-bezier(0,0,0.2,1) both}
@media (max-width:820px){.login-page-container .left-panel{display:none !important}.login-page-container .right-panel{min-height:100vh}}
@media (prefers-reduced-motion:reduce){.login-page-container *,.login-page-container *::before,.login-page-container *::after{animation-duration:1ms !important;transition-duration:1ms !important}}
`;

// ─── Interactive dot grid ─────────────────────────────────────────
const InteractiveGrid = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let frameId;
    const spacing = 25;
    const radius = 1.5;
    const dots = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      dots.length = 0;
      for (let x = 0; x < canvas.width; x += spacing)
        for (let y = 0; y < canvas.height; y += spacing)
          dots.push({ ox: x, oy: y, x, y });
    };
    window.addEventListener("resize", resize);
    resize();

    const parent = canvas.parentElement;
    const onMove = (e) => { const r = parent.getBoundingClientRect(); mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onLeave = () => { mouseRef.current = { x: -1000, y: -1000 }; };
    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x: mx, y: my } = mouseRef.current;
      for (const dot of dots) {
        const dx = dot.ox - mx, dy = dot.oy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxD = 140;
        if (dist < maxD) {
          const f = (maxD - dist) / maxD;
          ctx.fillStyle = `rgb(${Math.round(231 - (231 - 120) * f)},${Math.round(229 - (229 - 113) * f)},${Math.round(228 - (228 - 108) * f)})`;
          const angle = Math.atan2(dy, dx);
          dot.x += (dot.ox + Math.cos(angle) * f * 15 - dot.x) * 0.2;
          dot.y += (dot.oy + Math.sin(angle) * f * 15 - dot.y) * 0.2;
        } else {
          ctx.fillStyle = "#E7E5E4";
          dot.x += (dot.ox - dot.x) * 0.1;
          dot.y += (dot.oy - dot.y) * 0.1;
        }
        ctx.beginPath(); ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2); ctx.fill();
      }
      frameId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />;
};

// ─── Main component ───────────────────────────────────────────────
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [shake, setShake] = useState(null);
  const [currentView, setCurrentView] = useState("login");

  // forgot password
  const [forgotEmail, setForgotEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [forgotErrors, setForgotErrors] = useState({});
  const [forgotShake, setForgotShake] = useState(null);

  const { login } = useAuth();
  const { updateToken } = useWebSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const calledOnce = useRef(false);

  // load DM Sans font
  useEffect(() => {
    ["400", "500", "600", "700"].forEach((w) => {
      if (!document.getElementById(`font-dm-sans-${w}`)) {
        const l = document.createElement("link");
        l.id = `font-dm-sans-${w}`; l.rel = "stylesheet";
        l.href = `https://cdn.jsdelivr.net/npm/@fontsource/dm-sans@5/${w}.css`;
        document.head.appendChild(l);
      }
    });
  }, []);

  // first login toast
  useEffect(() => {
    if (localStorage.getItem("isfirsttlogin")) {
      showStatusToast("Please change your password first.");
      localStorage.removeItem("isfirsttlogin");
    }
  }, []);

  // ── OAuth callback ──────────────────────────────────────────────
  useEffect(() => {
    if (calledOnce.current) return;
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      showStatusToast(`Login error: ${error}`, "error");
      navigate("/login", { replace: true });
      return;
    }
    if (!code) return;

    calledOnce.current = true;

    const doLogin = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/callback?code=${encodeURIComponent(code)}`,
          { withCredentials: true }
        );

        const { access_token, redirect: redirectPath } = response.data;
        const path = redirectPath || "/dashboard";

        // ✅ login stores both tokens in localStorage
        login(access_token, path === "/change-password");
        updateToken(access_token);
        if (document.startViewTransition) {
          document.startViewTransition(() => {
            navigate(path, { replace: true });
          });
        } else {
          navigate(path, { replace: true });
        }
        window.history.replaceState({}, document.title, window.location.pathname);

      } catch (err) {
        const detail = err.response?.data?.error_description || err.response?.data?.detail || err.message;
        showStatusToast("OAuth login failed: " + detail, "error");
        window.history.replaceState({}, document.title, window.location.pathname);
        navigate("/", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    doLogin();
  }, [location.search, login, navigate]);

  const handleMicrosoftLogin = () => {
    window.location.href = `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/ms-login`;
  };

  // ── Validation ──────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!email.trim()) e.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter a valid email address";
    if (!pw) e.pw = "Password is required";
    return e;
  };

  // ── Normal login ────────────────────────────────────────────────
  const handleSubmit = async () => {

    const v = validate();

    if (Object.keys(v).length) {
      setErrors(v);
      setShake(v.email ? "email" : "pw");
      setTimeout(() => setShake(null), 450);
      return;
    }

    setErrors({});
    setLoading(true);

    try {

      const res = await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/login`,
        { email, password: pw },
        {
          withCredentials: true,
        }
      );

      const { access_token, redirect } = res.data;

      const redirectPath =
        redirect || "/dashboard";

      login(
        access_token,
        redirectPath === "/change-password"
      );
      updateToken(access_token);

      if (document.startViewTransition) {
        document.startViewTransition(() => {
          navigate(redirectPath, { replace: true });
        });
      } else {
        navigate(redirectPath, { replace: true });
      }

    } catch (err) {

      showStatusToast(
        "Login failed: " +
        (err.response?.data?.detail || err.message),
        "error"
      );

    } finally {
      setLoading(false);
    }
  };

  // ── Forgot password ─────────────────────────────────────────────
  const handleSendOtp = async () => {
    const e = {};
    if (!forgotEmail.trim()) e.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) e.email = "Enter a valid email address";
    if (Object.keys(e).length) { setForgotErrors(e); setForgotShake("email"); setTimeout(() => setForgotShake(null), 450); return; }
    setForgotErrors({});
    setSendingOtp(true);
    try {
      await axios.post(`${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/send-otp`, { email: forgotEmail.trim() });
      setOtpSent(true);
      showStatusToast("OTP sent to your email. Check inbox/spam.", "success");
    } catch (err) {
      showStatusToast("Failed to send OTP: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleReset = async () => {
    const e = {};
    if (!forgotEmail.trim()) e.email = "Email address is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail.trim())) e.email = "Enter a valid email address";
    if (!otp.trim()) e.otp = "OTP is required";
    if (!newPassword) e.newPassword = "New password is required";
    if (Object.keys(e).length) {
      setForgotErrors(e);
      setForgotShake(e.email ? "email" : e.otp ? "otp" : "newPassword");
      setTimeout(() => setForgotShake(null), 450);
      return;
    }
    setForgotErrors({});
    setResetting(true);
    try {
      await axios.post(`${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/auth/forgot-password`, {
        email: forgotEmail.trim(), otp: otp.trim(), new_password: newPassword,
      });
      showStatusToast("Password reset successfully!", "success");
      setCurrentView("login");
      setForgotEmail(""); setOtp(""); setNewPassword(""); setOtpSent(false);
    } catch (err) {
      showStatusToast("Error resetting password: " + (err.response?.data?.detail || err.message), "error");
    } finally {
      setResetting(false);
    }
  };

  const onKey = (e) => { if (e.key === "Enter") handleSubmit(); };
  const onForgotKey = (e) => { if (e.key === "Enter") otpSent ? handleReset() : handleSendOtp(); };
  const clrErr = (f) => setErrors((p) => ({ ...p, [f]: "" }));
  const clrForgotErr = (f) => setForgotErrors((p) => ({ ...p, [f]: "" }));

  const EYE_OPEN = "M13.5 7s-2 3.5-5.5 3.5S2.5 7 2.5 7 4.5 3.5 8 3.5 13.5 7 13.5 7zM8 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4z";
  const EYE_CLOSED = "M13.5 7s-2 3.5-5.5 3.5S2.5 7 2.5 7 4.5 3.5 8 3.5 13.5 7 13.5 7zM8 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM2 2l12 12";
  const EyeIcon = ({ show }) => (
    <svg width={17} height={17} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d={show ? EYE_CLOSED : EYE_OPEN} />
    </svg>
  );

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="login-page-container" style={{ height: "100vh", display: "flex", overflow: "hidden" }}>
      <style>{customCSS}</style>

      {/* LEFT PANEL */}
      <div className="left-panel panel-l" style={{ width: "55%", height: "100vh", background: "var(--neutral-100)", borderRight: "1px solid var(--neutral-200)", display: "flex", flexDirection: "column", padding: "48px", position: "relative", overflow: "hidden" }}>
        <InteractiveGrid />
        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "40px" }}>
            <img src="/logo.png" alt="Logo" style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "10px", flexShrink: 0 }} />
            <span style={{ fontSize: "20px", fontWeight: 600, color: "var(--neutral-800)", letterSpacing: "-0.01em" }}>Paves Enterprise App</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "84px", fontWeight: 700, lineHeight: 0.88, color: "#d8d3c8ff", letterSpacing: "-0.05em", marginBottom: "40px", userSelect: "none", pointerEvents: "none" }}>Work<br />Space</div>
            <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--neutral-950)", letterSpacing: "-0.022em", lineHeight: 1.25, marginBottom: "14px" }}>Your organization's<br />operational hub</h1>
            <p style={{ fontSize: "14px", color: "var(--neutral-500)", lineHeight: 1.7, maxWidth: "550px", marginBottom: "48px" }}>Manage leave, track timesheets, handle projects, and access all your internal tools through a single gateway.</p>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {SERVICES.map(({ label, d }) => (
                <div key={label} className="svc-item" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "7px", opacity: 0.55 }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "9px", background: "#fff", border: "1px solid var(--neutral-200)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(12,10,9,.05)" }}>
                    <SvcIcon d={d} />
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--neutral-500)", letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="right-panel panel-r" style={{ flex: 1, height: "100vh", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px", position: "relative" }}>
        <div style={{ width: "100%", maxWidth: "360px" }}>

          {currentView === "login" ? (
            <>
              <div className="a1" style={{ marginBottom: "40px" }}>
                <h2 style={{ fontSize: "28px", fontWeight: 700, color: "var(--neutral-950)", letterSpacing: "-0.022em", lineHeight: 1.2, marginBottom: "8px" }}>Welcome back</h2>
                <p style={{ fontSize: "14px", color: "var(--neutral-500)", lineHeight: 1.5, margin: 0 }}>Sign in to continue to your workspace</p>
              </div>

              <div className="a2">
                <button type="button" className="btn-ms" disabled={loading} onClick={handleMicrosoftLogin}>
                  <MS_LOGO />
                  Continue with Microsoft
                </button>
              </div>

              <div className="a3" style={{ display: "flex", alignItems: "center", gap: "12px", margin: "24px 0" }}>
                <div style={{ flex: 1, height: "1px", background: "var(--neutral-150)" }} />
                <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--neutral-300)", letterSpacing: ".1em", textTransform: "uppercase" }}>or</span>
                <div style={{ flex: 1, height: "1px", background: "var(--neutral-150)" }} />
              </div>

              <div className={`a4${shake === "email" ? " shake" : ""}`} style={{ marginBottom: "16px" }}>
                <FloatingInput id="email" label="Email address" type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); clrErr("email"); }}
                  onKeyDown={onKey} error={errors.email} autoComplete="email" />
              </div>

              <div className={`a5${shake === "pw" ? " shake" : ""}`}>
                <FloatingInput id="password" label="Password" type={showPw ? "text" : "password"} value={pw}
                  onChange={(e) => { setPw(e.target.value); clrErr("pw"); }}
                  onKeyDown={onKey} error={errors.pw} autoComplete="current-password" hasSuffix>
                  <button type="button" className="pw-btn" tabIndex={-1} onClick={() => setShowPw((v) => !v)}>
                    <EyeIcon show={showPw} />
                  </button>
                </FloatingInput>
              </div>

              <div className="a6" style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                <button type="button" className="lnk" style={{ fontSize: "13px", fontWeight: 500, color: "var(--neutral-400)" }} onClick={() => setCurrentView("forgot")}>
                  Forgot password?
                </button>
              </div>

              <div className="a7" style={{ marginTop: "24px" }}>
                <button type="button" className="btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? <Dots /> : "Sign in"}
                </button>
              </div>

              <div className="a8" style={{ marginTop: "16px", textAlign: "center" }}>
                <p style={{ fontSize: "11px", color: "var(--neutral-300)", lineHeight: 1.6, margin: 0 }}>
                  By signing in, you agree to the{" "}
                  <button type="button" className="lnk" style={{ fontSize: "11px", color: "var(--neutral-400)", textDecoration: "underline", textUnderlineOffset: "2px" }}>User Policy</button>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="a1" style={{ marginBottom: "40px" }}>
                <h2 style={{ fontSize: "28px", fontWeight: 700, color: "var(--neutral-950)", letterSpacing: "-0.022em", lineHeight: 1.2, marginBottom: "8px" }}>Reset password</h2>
                <p style={{ fontSize: "14px", color: "var(--neutral-500)", lineHeight: 1.5, margin: 0 }}>Enter your email to receive an OTP and set a new password</p>
              </div>

              <div className={`a2${forgotShake === "email" ? " shake" : ""}`} style={{ marginBottom: "16px" }}>
                <FloatingInput id="forgotEmail" label="Email address" type="email" value={forgotEmail}
                  onChange={(e) => { setForgotEmail(e.target.value); clrForgotErr("email"); }}
                  onKeyDown={onForgotKey} error={forgotErrors.email} autoComplete="email" />
              </div>

              {!otpSent ? (
                <div className="a3" style={{ marginTop: "24px" }}>
                  <button type="button" className="btn-primary" onClick={handleSendOtp} disabled={sendingOtp}>
                    {sendingOtp ? <Dots /> : "Send OTP"}
                  </button>
                </div>
              ) : (
                <>
                  <div className={`a3${forgotShake === "otp" ? " shake" : ""}`} style={{ marginBottom: "16px" }}>
                    <FloatingInput id="otp" label="Enter OTP" value={otp}
                      onChange={(e) => { setOtp(e.target.value); clrForgotErr("otp"); }}
                      onKeyDown={onForgotKey} error={forgotErrors.otp} autoComplete="off" />
                  </div>
                  <div className={`a4${forgotShake === "newPassword" ? " shake" : ""}`} style={{ marginBottom: "16px" }}>
                    <FloatingInput id="newPassword" label="New Password" type={showNewPw ? "text" : "password"} value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); clrForgotErr("newPassword"); }}
                      onKeyDown={onForgotKey} error={forgotErrors.newPassword} autoComplete="new-password" hasSuffix>
                      <button type="button" className="pw-btn" tabIndex={-1} onClick={() => setShowNewPw((v) => !v)}>
                        <EyeIcon show={showNewPw} />
                      </button>
                    </FloatingInput>
                  </div>
                  <div className="a5" style={{ marginTop: "24px" }}>
                    <button type="button" className="btn-primary" onClick={handleReset} disabled={resetting}>
                      {resetting ? <Dots /> : "Reset Password"}
                    </button>
                  </div>
                </>
              )}

              <div className="a6" style={{ marginTop: "24px", textAlign: "center" }}>
                <button type="button" className="lnk" style={{ fontSize: "13px", fontWeight: 500, color: "var(--neutral-400)" }} onClick={() => setCurrentView("login")}>
                  ← Back to login
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ position: "absolute", bottom: "28px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="var(--neutral-300)" strokeWidth={1.5}>
              <path d="M8 2L4 4v5c0 3 4 5 4 5s4-2 4-5V4L8 2z" />
            </svg>
            <span style={{ fontSize: "11px", color: "var(--neutral-300)" }}>Secured with TLS</span>
          </div>
          <span style={{ fontSize: "11px", color: "#DDDAD7" }}>·</span>
          <button type="button" className="lnk" style={{ fontSize: "11px", color: "var(--neutral-300)" }}>IT Support</button>
          <span style={{ fontSize: "11px", color: "#DDDAD7" }}>·</span>
          <button type="button" className="lnk" style={{ fontSize: "11px", color: "var(--neutral-300)" }}>Privacy Policy</button>
        </div>
      </div>
    </div>
  );
}