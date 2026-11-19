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
    <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
        {hasSuffix && <div className="field-suffix">{children}</div>}
      </div>
      {error && <p id={`${id}-err`} role="alert" className="err-msg">{error}</p>}
    </div>
  );
}

// ─── Loading dots ─────────────────────────────────────────────────
function Dots() {
  return (
    <div className="dots">
      {[0, 1, 2].map((i) => (
        <span key={i} className="dot" style={{ animationDelay: `${i * 145}ms` }} />
      ))}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const customCSS = `
.login-page-container {
  --brand-950: #141B4D; --brand-900: #1E2A6B; --brand-700: #283C9A;
  --brand-600: #2F4BB8; --brand-500: #4A65D0; --brand-50: #F1F4FD;
  --rose-500: #E0345B;
  --ink-900: #0F172A; --ink-700: #334155; --ink-500: #64748B; --ink-400: #94A3B8;
  --line: #D5DBE7; --line-soft: #E9EDF4; --surface: #FFFFFF; --page: #F6F7FB;
  --danger: #DC2626;
  --ff: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-family: var(--ff); background: var(--page); color: var(--ink-900);
  min-height: 100vh; display: flex; overflow: hidden;
}

/* ── Animations ── */
@keyframes panelL { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
@keyframes panelR { from{opacity:0;transform:translateX(20px)}  to{opacity:1;transform:translateX(0)} }
@keyframes fadeUp { from{opacity:0;transform:translateY(10px)}  to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
@keyframes slideUp { from{opacity:0;transform:translateY(4px)}  to{opacity:1;transform:translateY(0)} }
@keyframes shake  { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
@keyframes dot    { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-5px);opacity:1} }
@keyframes svcIn  { from{opacity:0;translate:0 8px} to{opacity:1;translate:0 0} }
@keyframes drift  { 0%,100%{transform:translate(0,0)} 50%{transform:translate(18px,-14px)} }

/* ── Left brand panel ── */
.login-page-container .left-panel {
  flex: 0 0 55%; height: 100vh; position: relative; overflow: hidden;
  background: linear-gradient(155deg, var(--brand-950) 0%, var(--brand-900) 45%, var(--brand-700) 100%);
  color: #fff; padding: 48px 56px; display: flex; flex-direction: column;
  animation: panelL 420ms cubic-bezier(0,0,0.2,1) both;
}
.login-page-container .left-panel::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image: radial-gradient(rgba(255,255,255,.14) 1px, transparent 1px);
  background-size: 24px 24px; opacity: .6;
  mask-image: linear-gradient(to bottom, #000 0%, transparent 85%);
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, transparent 85%);
}
.login-page-container .orb { position: absolute; border-radius: 50%; filter: blur(60px); pointer-events: none; animation: drift 14s ease-in-out infinite; }
.login-page-container .orb-1 { width: 380px; height: 380px; right: -120px; top: -100px; background: rgba(224,52,91,.35); }
.login-page-container .orb-2 { width: 320px; height: 320px; left: -100px; bottom: -120px; background: rgba(74,101,208,.55); animation-delay: -6s; }
.login-page-container .left-inner { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; }

.login-page-container .brand { display: flex; align-items: center; gap: 14px; animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 120ms both; }
.login-page-container .brand-logo { width: 44px; height: 44px; object-fit: contain; border-radius: 12px; background: #fff; padding: 4px; flex-shrink: 0; }
.login-page-container .brand span { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; }

.login-page-container .hero { margin: auto 0; max-width: 520px; animation: fadeUp 360ms cubic-bezier(0,0,0.2,1) 180ms both; }
.login-page-container .eyebrow { display: inline-block; font-size: 12px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #FFB4C4; background: rgba(224,52,91,.18); border: 1px solid rgba(224,52,91,.35); padding: 6px 12px; border-radius: 999px; margin-bottom: 22px; }
.login-page-container .hero h1 { font-size: 44px; font-weight: 700; line-height: 1.12; letter-spacing: -0.03em; margin: 0 0 18px; }
.login-page-container .hero p { font-size: 16px; line-height: 1.7; color: rgba(255,255,255,.78); margin: 0; max-width: 460px; }

.login-page-container .svc-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; max-width: 480px; }
.login-page-container .svc-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14); color: rgba(255,255,255,.92); animation: svcIn 350ms cubic-bezier(0,0,0.2,1) both; transition: transform 160ms ease, background 160ms ease, border-color 160ms ease; cursor: default; }
.login-page-container .svc-item:nth-child(1){animation-delay:520ms}
.login-page-container .svc-item:nth-child(2){animation-delay:570ms}
.login-page-container .svc-item:nth-child(3){animation-delay:620ms}
.login-page-container .svc-item:nth-child(4){animation-delay:670ms}
.login-page-container .svc-item:nth-child(5){animation-delay:720ms}
.login-page-container .svc-item:nth-child(6){animation-delay:770ms}
.login-page-container .svc-item:hover { transform: translateY(-2px); background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.26); }
.login-page-container .svc-tile { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.login-page-container .svc-item span { font-size: 13px; font-weight: 500; }

/* ── Right form panel ── */
.login-page-container .right-panel {
  flex: 1; min-height: 100vh; height: 100vh; overflow-y: auto; background: var(--surface);
  display: flex; flex-direction: column; padding: 32px 24px 28px; position: relative;
  animation: panelR 420ms cubic-bezier(0,0,0.2,1) 80ms both;
}
.login-page-container .form-wrap { margin: auto; width: 100%; max-width: 380px; padding: 24px 0; }
.login-page-container .mobile-brand { display: none; align-items: center; gap: 10px; margin-bottom: 32px; font-size: 16px; font-weight: 600; color: var(--ink-900); }
.login-page-container .mobile-brand img { width: 36px; height: 36px; object-fit: contain; border-radius: 10px; }

.login-page-container .a1 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 160ms both; margin-bottom: 36px; }
.login-page-container .a2 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 220ms both; }
.login-page-container .a3 { animation: fadeIn 260ms ease 275ms both; }
.login-page-container .a4 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 280ms both; }
.login-page-container .a5 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 330ms both; }
.login-page-container .a6 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 375ms both; }
.login-page-container .a7 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 415ms both; }
.login-page-container .a8 { animation: fadeUp 300ms cubic-bezier(0,0,0.2,1) 450ms both; }
.login-page-container .shake { animation: shake 380ms cubic-bezier(0.4,0,0.2,1) both !important; }

.login-page-container .form-title { font-size: 30px; font-weight: 700; color: var(--ink-900); letter-spacing: -0.025em; line-height: 1.2; margin: 0 0 8px; }
.login-page-container .form-sub { font-size: 14.5px; color: var(--ink-500); line-height: 1.55; margin: 0; }

/* Buttons */
.login-page-container .btn-ms { width: 100%; height: 50px; background: #fff; color: var(--ink-900); border: 1px solid var(--line); border-radius: 12px; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14.5px; font-weight: 600; font-family: var(--ff); cursor: pointer; transition: transform 140ms ease, box-shadow 140ms ease, background 120ms ease, border-color 120ms ease; }
.login-page-container .btn-ms:hover:not(:disabled) { background: #F8FAFC; border-color: #B9C2D3; box-shadow: 0 4px 14px rgba(15,23,42,.08); transform: translateY(-1px); }
.login-page-container .btn-ms:active:not(:disabled) { transform: translateY(0); box-shadow: none; }
.login-page-container .btn-ms:disabled { opacity: .6; cursor: not-allowed; }

.login-page-container .btn-primary { width: 100%; height: 50px; background: linear-gradient(135deg, var(--brand-600) 0%, var(--brand-700) 100%); color: #fff; border: none; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 600; font-family: var(--ff); letter-spacing: .01em; cursor: pointer; box-shadow: 0 6px 18px rgba(47,75,184,.28); transition: transform 140ms ease, box-shadow 140ms ease, filter 120ms ease; }
.login-page-container .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(47,75,184,.36); filter: brightness(1.06); }
.login-page-container .btn-primary:active:not(:disabled) { transform: translateY(0); box-shadow: 0 3px 10px rgba(47,75,184,.3); }
.login-page-container .btn-primary:disabled { opacity: .75; cursor: not-allowed; }

.login-page-container .btn-ms:focus-visible, .login-page-container .btn-primary:focus-visible, .login-page-container .lnk:focus-visible, .login-page-container .pw-btn:focus-visible { outline: 2px solid var(--brand-500); outline-offset: 2px; }

.login-page-container .divider { display: flex; align-items: center; gap: 14px; margin: 26px 0; }
.login-page-container .divider::before, .login-page-container .divider::after { content: ""; flex: 1; height: 1px; background: var(--line-soft); }
.login-page-container .divider span { font-size: 11px; font-weight: 600; color: var(--ink-400); letter-spacing: .12em; text-transform: uppercase; }

.login-page-container .lnk { background: none; border: none; cursor: pointer; font-family: var(--ff); transition: color 120ms ease; padding: 0; }
.login-page-container .lnk:hover { color: var(--brand-600) !important; }
.login-page-container .lnk:focus-visible { border-radius: 4px; }
.login-page-container .forgot { font-size: 13.5px; font-weight: 500; color: var(--ink-500); }
.login-page-container .back { font-size: 13.5px; font-weight: 500; color: var(--ink-500); }

.login-page-container .pw-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; padding: 4px; color: var(--ink-400); transition: color 120ms ease; }
.login-page-container .pw-btn:hover { color: var(--ink-700); }

.login-page-container .dots { display: flex; gap: 5px; align-items: center; }
.login-page-container .dots .dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.9); animation: dot 700ms ease-in-out infinite; }
.login-page-container .dots .dot:nth-child(2) { animation-delay: 145ms; }
.login-page-container .dots .dot:nth-child(3) { animation-delay: 290ms; }

/* Inputs (floating label) */
.login-page-container .field-wrap { position: relative; height: 56px; border-radius: 12px; background: #fff; transition: box-shadow 140ms ease, background 140ms ease; }
.login-page-container .field-wrap.default { box-shadow: inset 0 0 0 1px var(--line); }
.login-page-container .field-wrap:not(.focused):not(.errored):hover { box-shadow: inset 0 0 0 1px #B9C2D3; }
.login-page-container .field-wrap.focused { box-shadow: inset 0 0 0 2px var(--brand-600), 0 0 0 4px rgba(47,75,184,.12); }
.login-page-container .field-wrap.errored { box-shadow: inset 0 0 0 1.5px var(--danger); background: #FFF8F8; }
.login-page-container .field-suffix { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); z-index: 2; }
.login-page-container .field-label { position: absolute; left: 16px; pointer-events: none; white-space: nowrap; font-size: 15px; font-weight: 400; line-height: 1; z-index: 1; transition: top 180ms cubic-bezier(0,0,0.2,1), transform 180ms cubic-bezier(0,0,0.2,1), color 140ms ease; transform-origin: left top; top: 50%; transform: translateY(-50%) scale(1); color: var(--ink-500); }
.login-page-container .field-input:focus ~ .field-label,
.login-page-container .field-input:not(:placeholder-shown) ~ .field-label,
.login-page-container .field-input:-webkit-autofill ~ .field-label { top: 12px; transform: scale(0.78); }
.login-page-container .field-input:focus ~ .field-label.fc { color: var(--brand-600); }
.login-page-container .field-input ~ .field-label.err { color: var(--danger); }
.login-page-container .field-input { position: absolute; inset: 0; width: 100%; height: 100%; padding: 2px 16px 0; font-size: 15px; font-family: var(--ff); font-weight: 400; color: var(--ink-900); background: transparent; border: none; outline: none; border-radius: 12px; transition: padding-top 180ms cubic-bezier(0,0,0.2,1); }
.login-page-container .field-input.has-suffix { padding-right: 48px; }
.login-page-container .field-input:focus, .login-page-container .field-input:not(:placeholder-shown), .login-page-container .field-input:-webkit-autofill { padding-top: 20px; }
.login-page-container .err-msg { margin: 6px 0 0; font-size: 12.5px; color: var(--danger); animation: slideUp 200ms cubic-bezier(0,0,0.2,1) both; }

/* Footer */
.login-page-container .page-footer { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 12px; padding-top: 16px; font-size: 12px; color: var(--ink-400); }
.login-page-container .page-footer .sep { color: #CBD2DE; }
.login-page-container .page-footer .secure { display: flex; align-items: center; gap: 6px; }

/* ── 3D depth layer ── */

.login-page-container .left-inner { transform: perspective(1200px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)); transform-style: preserve-3d; transition: transform 450ms cubic-bezier(.2,.7,.2,1); }
.login-page-container .brand-logo { transform: translateZ(30px); box-shadow: 0 6px 0 rgba(6,10,40,.45), 0 18px 30px rgba(6,10,40,.45); }
.login-page-container .hero h1 { text-shadow: 0 1px 0 #3A4AA6, 0 2px 0 #323F93, 0 3px 0 #2A3584, 0 4px 0 #222C74, 0 18px 30px rgba(5,8,30,.5); }
.login-page-container .svc-grid { transform-style: preserve-3d; }
.login-page-container .svc-item { transform-style: preserve-3d; box-shadow: 0 8px 0 rgba(6,10,40,.4), 0 16px 26px rgba(6,10,40,.35); transition: transform 200ms cubic-bezier(.2,.7,.2,1), box-shadow 200ms ease, background 160ms ease, border-color 160ms ease; }
.login-page-container .svc-item:hover { transform: translateY(-6px) rotateX(10deg) rotateY(-6deg); box-shadow: 0 14px 0 rgba(6,10,40,.4), 0 26px 36px rgba(6,10,40,.45); }
.login-page-container .svc-tile { transform: translateZ(18px); box-shadow: 0 4px 0 rgba(6,10,40,.35), 0 8px 14px rgba(6,10,40,.3); }

/* form card tilt */
.login-page-container .form-wrap { transform: perspective(1400px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)); transform-style: preserve-3d; transition: transform 450ms cubic-bezier(.2,.7,.2,1); }

/* extruded 3D buttons */
.login-page-container .btn-primary { box-shadow: 0 6px 0 #1B2E86, 0 16px 26px rgba(47,75,184,.35); }
.login-page-container .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 0 #1B2E86, 0 20px 30px rgba(47,75,184,.4); filter: brightness(1.05); }
.login-page-container .btn-primary:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 2px 0 #1B2E86, 0 6px 12px rgba(47,75,184,.3); }
.login-page-container .btn-ms { box-shadow: 0 5px 0 #CDD4E1, 0 10px 18px rgba(15,23,42,.06); }
.login-page-container .btn-ms:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 7px 0 #C2CBDB, 0 16px 24px rgba(15,23,42,.12); }
.login-page-container .btn-ms:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 2px 0 #CDD4E1; }

/* depth on inputs */
.login-page-container .field-wrap.default { box-shadow: inset 0 0 0 1px var(--line), 0 4px 0 #E2E7F0, 0 10px 18px rgba(15,23,42,.05); }
.login-page-container .field-wrap.focused { transform: translateZ(12px); box-shadow: inset 0 0 0 2px var(--brand-600), 0 0 0 4px rgba(47,75,184,.12), 0 6px 0 #C9D3F0, 0 18px 26px rgba(47,75,184,.18); }

/* Responsive */
@media (max-width: 1024px) {
  .login-page-container .hero h1 { font-size: 36px; }
  .login-page-container .left-panel { padding: 40px; }
}
@media (max-width: 820px) {
  .login-page-container { display: block; overflow-y: auto; height: auto; }
  .login-page-container .left-panel { display: none; }
  .login-page-container .right-panel { height: auto; min-height: 100vh; overflow: visible; padding: 28px 20px 24px; }
  .login-page-container .mobile-brand { display: flex; }
  .login-page-container .form-wrap { padding: 8px 0; }
}
@media (prefers-reduced-motion: reduce) {
  .login-page-container *, .login-page-container *::before, .login-page-container *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
`;

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
    <svg width={18} height={18} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <path d={show ? EYE_CLOSED : EYE_OPEN} />
    </svg>
  );

  // ── 3D tilt (sets CSS vars only; no re-render) ──────────────────
  const tilt = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`);
    e.currentTarget.style.setProperty("--ry", `${(x * 10).toFixed(2)}deg`);
  };
  const untilt = (e) => {
    e.currentTarget.style.setProperty("--rx", "0deg");
    e.currentTarget.style.setProperty("--ry", "0deg");
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="login-page-container">
      <style>{customCSS}</style>

      {/* LEFT BRAND PANEL */}
      <aside className="left-panel" onMouseMove={tilt} onMouseLeave={untilt}>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="left-inner">
          <div className="brand">
            <img src="/logo.png" alt="Logo" className="brand-logo" />
            <span>Paves Enterprise App</span>
          </div>

          <div className="hero">
            <span className="eyebrow">Internal workspace</span>
            <h1>Your organization's operational hub</h1>
            <p>Manage leave, track timesheets, handle projects, and access all your internal tools through a single gateway.</p>
          </div>

          <div className="svc-grid">
            {SERVICES.map(({ label, d }) => (
              <div key={label} className="svc-item">
                <div className="svc-tile"><SvcIcon d={d} /></div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* RIGHT FORM PANEL */}
      <main className="right-panel">
        <div className="form-wrap" onMouseMove={tilt} onMouseLeave={untilt}>
          <div className="mobile-brand">
            <img src="/logo.png" alt="Logo" />
            <span>Paves Enterprise App</span>
          </div>

          {currentView === "login" ? (
            <>
              <div className="a1">
                <h2 className="form-title">Welcome back</h2>
                <p className="form-sub">Sign in to continue to your workspace</p>
              </div>

              <div className="a2">
                <button type="button" className="btn-ms" disabled={loading} onClick={handleMicrosoftLogin}>
                  <MS_LOGO />
                  Continue with Microsoft
                </button>
              </div>

              <div className="a3 divider">
                <span>or</span>
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
                  <button type="button" className="pw-btn" tabIndex={-1} aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw((v) => !v)}>
                    <EyeIcon show={showPw} />
                  </button>
                </FloatingInput>
              </div>

              <div className="a6" style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                <button type="button" className="lnk forgot" onClick={() => setCurrentView("forgot")}>
                  Forgot password?
                </button>
              </div>

              <div className="a7" style={{ marginTop: "24px" }}>
                <button type="button" className="btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? <Dots /> : "Sign in"}
                </button>
              </div>

              <div className="a8" style={{ marginTop: "20px", textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: "var(--ink-400)", lineHeight: 1.6, margin: 0 }}>
                  By signing in, you agree to the{" "}
                  <button type="button" className="lnk" style={{ fontSize: "12px", color: "var(--ink-500)", textDecoration: "underline", textUnderlineOffset: "3px" }}>User Policy</button>
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="a1">
                <h2 className="form-title">Reset password</h2>
                <p className="form-sub">Enter your email to receive an OTP and set a new password</p>
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
                      <button type="button" className="pw-btn" tabIndex={-1} aria-label={showNewPw ? "Hide password" : "Show password"} onClick={() => setShowNewPw((v) => !v)}>
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
                <button type="button" className="lnk back" onClick={() => setCurrentView("login")}>
                  ← Back to login
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="page-footer">
          <span className="secure">
            <svg width={11} height={11} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path d="M8 2L4 4v5c0 3 4 5 4 5s4-2 4-5V4L8 2z" />
            </svg>
            Secured with TLS
          </span>
          <span className="sep">·</span>
          <button type="button" className="lnk" style={{ fontSize: "12px", color: "var(--ink-400)" }}>IT Support</button>
          <span className="sep">·</span>
          <button type="button" className="lnk" style={{ fontSize: "12px", color: "var(--ink-400)" }}>Privacy Policy</button>
        </footer>
      </main>
    </div>
  );
}
