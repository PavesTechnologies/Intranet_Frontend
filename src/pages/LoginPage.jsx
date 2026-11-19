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

const SERVICE_DESC = {
  Dashboard: "See your day at a glance: tasks, approvals and updates.",
  Leave: "Apply for leave and track your balances in seconds.",
  Timesheets: "Log hours and submit weekly timesheets with ease.",
  Projects: "Follow project progress and team allocations.",
  Resources: "Find people, skills and availability across teams.",
  Onboarding: "Guide new joiners through every first-week step.",
};
const SVC_CYCLE_MS = 2800;

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
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

// ─── Illustration: person at a desk with a dashboard (Paves colours) ─
function WorkIllustration() {
  const NAVY = "#0A174E", NAVY2 = "#263383", INDIGO = "#0A0082", PINK = "#FF3D72";
  const SOFT = "#F4F6FC", LINE = "#D5D9EC", SKIN = "#F3C6A8", HAIR = "#1C1840";
  const bars = [38, 56, 30, 66, 46, 54];
  const [run, setRun] = useState(0); // bump to replay the walk-in intro
  const head = (
    <>
      <circle cx="211" cy="194" r="24" fill={HAIR} />
      <circle cx="221" cy="202" r="19" fill={SKIN} />
      <circle cx="193" cy="181" r="10" fill={HAIR} />
      <path d="M204 186 Q220 174 238 190 L238 184 Q222 168 202 180 Z" fill={HAIR} />
      <circle className="wi-eye" cx="231" cy="201" r="1.9" fill={NAVY} />
      <path d="M233 211 q-3 2 -6 1" fill="none" stroke="#C9826A" strokeWidth="1.6" strokeLinecap="round" />
    </>
  );
  return (
    <svg viewBox="0 0 480 420" role="img" aria-label="Employee walking in and working with the Paves dashboard (click to replay)"
      onClick={() => setRun((r) => r + 1)} style={{ cursor: "pointer" }}>
      <defs>
        <clipPath id="wi-win"><rect x="110" y="16" width="340" height="196" rx="14" /></clipPath>
        <filter id="wi-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="12" stdDeviation="14" floodColor={NAVY} floodOpacity=".14" />
        </filter>
        <filter id="wi-soft" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor={NAVY} floodOpacity=".16" />
        </filter>
        <linearGradient id="wi-blob" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={INDIGO} stopOpacity=".14" />
          <stop offset="1" stopColor={PINK} stopOpacity=".16" />
        </linearGradient>
      </defs>

      {/* soft brand blob behind the scene */}
      <path className="wi-blobshape" d="M250 40c70-10 160 20 190 90s10 150-40 200-150 70-230 40S40 260 50 180 150 55 250 40z" fill="url(#wi-blob)" />

      {/* floor shadow */}
      <ellipse cx="300" cy="404" rx="175" ry="9" fill={NAVY} opacity=".08" />

      {/* dashboard window */}
      <g filter="url(#wi-shadow)">
        <rect x="110" y="16" width="340" height="196" rx="14" fill="#fff" />
      </g>
      <g clipPath="url(#wi-win)">
        <rect x="110" y="16" width="340" height="28" fill={NAVY} />
        <circle cx="127" cy="30" r="4" fill={PINK} />
        <circle cx="140" cy="30" r="4" fill="#fff" opacity=".55" />
        <circle cx="153" cy="30" r="4" fill="#fff" opacity=".3" />
        <rect x="190" y="26" width="120" height="8" rx="4" fill="#fff" opacity=".15" />
        {/* sidebar */}
        <rect x="110" y="44" width="64" height="170" fill={SOFT} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x="122" y={60 + i * 20} width={i === 0 ? 40 : 34} height="6" rx="3" fill={i === 0 ? INDIGO : LINE} />
        ))}
        {/* stat cards */}
        {[INDIGO, PINK, NAVY2].map((c, i) => (
          <g key={c}>
            <rect x={186 + i * 88} y="56" width="76" height="40" rx="8" fill={SOFT} />
            <rect x={196 + i * 88} y="65" width="30" height="4" rx="2" fill={LINE} />
            <rect x={196 + i * 88} y="76" width="42" height="9" rx="4.5" fill={c} />
          </g>
        ))}
        {/* bar chart */}
        <rect x="186" y="108" width="164" height="92" rx="8" fill={SOFT} />
        {bars.map((h, i) => (
          <rect key={i} className="wi-bar" style={{ animationDelay: `${i * 0.35}s` }} x={200 + i * 23} y={188 - h} width="12" height={h} rx="4" fill={i === 3 ? PINK : i % 2 ? "#5B66B8" : INDIGO} />
        ))}
        {/* donut */}
        <rect x="362" y="108" width="76" height="92" rx="8" fill={SOFT} />
        <circle cx="400" cy="150" r="22" fill="none" stroke={LINE} strokeWidth="9" />
        <circle className="wi-donut" cx="400" cy="150" r="22" fill="none" stroke={INDIGO} strokeWidth="9" strokeDasharray="76 138" transform="rotate(-90 400 150)" />
        <circle cx="400" cy="150" r="22" fill="none" stroke={PINK} strokeWidth="9" strokeDasharray="34 138" strokeDashoffset="-80" transform="rotate(-90 400 150)" />
        <rect x="380" y="182" width="40" height="5" rx="2.5" fill={LINE} />
      </g>

      {/* chair */}
      <rect x="164" y="250" width="11" height="78" rx="5.5" fill={NAVY} />
      <rect x="166" y="318" width="80" height="11" rx="5.5" fill={NAVY} />
      <rect x="202" y="329" width="8" height="50" fill={NAVY2} />
      <rect x="172" y="376" width="68" height="6" rx="3" fill={NAVY2} />
      <circle cx="176" cy="390" r="6" fill={NAVY} />
      <circle cx="236" cy="390" r="6" fill={NAVY} />

      {/* desk */}
      <rect x="262" y="300" width="198" height="10" rx="4" fill={NAVY2} />
      <rect x="304" y="310" width="8" height="92" fill={NAVY} />
      <rect x="436" y="310" width="8" height="92" fill={NAVY} />

      {/* plant */}
      <g className="wi-plant">
        <ellipse cx="418" cy="254" rx="8" ry="20" fill="#34B38A" transform="rotate(-20 418 254)" />
        <ellipse cx="432" cy="250" rx="8" ry="22" fill="#2A9D78" transform="rotate(18 432 250)" />
        <ellipse cx="425" cy="246" rx="7" ry="22" fill="#3CC497" />
      </g>
      <rect x="412" y="268" width="26" height="32" rx="5" fill={PINK} />

      {/* laptop */}
      <rect x="300" y="293" width="78" height="7" rx="3" fill="#C3C8DD" />
      <polygon points="370,294 388,240 396,242 378,296" fill="#AEB4CF" />
      <circle cx="384" cy="266" r="2.5" fill="#fff" />

      {/* mug */}
      <rect x="338" y="278" width="16" height="17" rx="3" fill="#fff" stroke={LINE} strokeWidth="1.5" />
      <path d="M354 282 q7 0 7 6 t-7 6" fill="none" stroke={LINE} strokeWidth="1.5" />
      <path className="wi-steam" d="M343 272 q-4 -5 0 -10 t0 -10" fill="none" stroke="#B6BCD6" strokeWidth="1.6" strokeLinecap="round" />
      <path className="wi-steam" style={{ animationDelay: "1.3s" }} d="M349 272 q-4 -5 0 -10 t0 -10" fill="none" stroke="#B6BCD6" strokeWidth="1.6" strokeLinecap="round" />

      {/* ── walk-in intro: walks in, turns to face the viewer and waves, then sits ── */}
      <g key={`walk-${run}`} className="wi-walker">
        {/* front-facing pose (shown only while saying hi) */}
        <g className="wi-front">
          <rect x="-18" y="286" width="16" height="98" rx="8" fill={NAVY2} />
          <rect x="2" y="286" width="16" height="98" rx="8" fill={NAVY2} />
          <rect x="-24" y="380" width="24" height="12" rx="6" fill={NAVY} />
          <rect x="0" y="380" width="24" height="12" rx="6" fill={NAVY} />
          <rect x="-27" y="204" width="54" height="94" rx="24" fill={PINK} />
          {/* resting arm (viewer's left) */}
          <path d="M-21 226 L-28 262 L-30 286" fill="none" stroke="#E2336A" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="-30" cy="290" r="6.5" fill={SKIN} />
          {/* waving arm (viewer's right) */}
          <g transform="translate(21 226)">
            <g className="wi-wave">
              <path d="M0 0 L3 38 L5 60" fill="none" stroke="#E2336A" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="5" cy="64" r="7" fill={SKIN} />
            </g>
          </g>
          {/* neck + front-facing head */}
          <rect x="-6.5" y="190" width="13" height="18" rx="4" fill={SKIN} />
          <circle cx="0" cy="176" r="25" fill={HAIR} />
          <circle cx="0" cy="150" r="11" fill={HAIR} />
          <circle cx="0" cy="184" r="20" fill={SKIN} />
          <path d="M-21 180 Q-18 160 0 160 Q18 160 21 180 Q14 168 0 168 Q-14 168 -21 180 Z" fill={HAIR} />
          <circle cx="-7.5" cy="185" r="2.1" fill={NAVY} />
          <circle cx="7.5" cy="185" r="2.1" fill={NAVY} />
          <circle cx="-12" cy="192" r="3.2" fill={PINK} opacity=".3" />
          <circle cx="12" cy="192" r="3.2" fill={PINK} opacity=".3" />
          <path d="M-6 193 Q0 199 6 193" fill="none" stroke="#C9826A" strokeWidth="1.8" strokeLinecap="round" />
        </g>

        {/* side-view pose (walking + sitting down) */}
        <g className="wi-profile">
        {/* back leg + back arm (darker, opposite phase) */}
        <g transform="translate(0 292)">
          <g className="wi-leg back">
            <rect x="-11" y="-6" width="22" height="98" rx="11" fill="#1E2A6E" />
            <rect x="-11" y="88" width="34" height="12" rx="6" fill={NAVY} />
          </g>
        </g>
        <g transform="translate(0 224)">
          <g className="wi-arm back">
            <path d="M0 0 L4 40 L8 64" fill="none" stroke="#C92A5C" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="8" cy="68" r="6.5" fill={SKIN} />
          </g>
        </g>
        {/* torso + head */}
        <rect x="-25" y="204" width="50" height="94" rx="23" fill={PINK} />
        <g transform="translate(-213 -20)">
          <rect x="208" y="212" width="13" height="20" rx="4" fill={SKIN} />
          {head}
        </g>
        {/* front leg + front arm */}
        <g transform="translate(0 292)">
          <g className="wi-leg">
            <rect x="-11" y="-6" width="22" height="98" rx="11" fill={NAVY2} />
            <rect x="-11" y="88" width="34" height="12" rx="6" fill={NAVY} />
          </g>
        </g>
        <g transform="translate(0 224)">
          <g className="wi-arm">
            <path d="M0 0 L4 40 L8 64" fill="none" stroke="#E2336A" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="8" cy="68" r="7" fill={SKIN} />
          </g>
        </g>
        </g>
      </g>

      {/* "Hi there!" speech bubble while waving */}
      <g key={`hi-${run}`} className="wi-hi">
        <g filter="url(#wi-soft)">
          <rect x="146" y="112" width="84" height="32" rx="13" fill="#fff" />
        </g>
        <path d="M156 142 L150 154 L166 143 Z" fill="#fff" />
        <text x="188" y="133" textAnchor="middle" fontSize="13" fontWeight="700" fill={NAVY} fontFamily="Poppins, Inter, sans-serif">Hi there!</text>
      </g>

      {/* ── seated figure: appears when the walker lands ── */}
      <g key={`sit-${run}`} className="wi-sitter">
      {/* person: legs */}
      <rect x="186" y="298" width="84" height="23" rx="11.5" fill={NAVY2} />
      <rect x="250" y="306" width="22" height="80" rx="11" fill={NAVY2} />
      <rect x="248" y="380" width="42" height="12" rx="6" fill={NAVY} />
      {/* torso */}
      <rect x="180" y="226" width="50" height="86" rx="23" fill={PINK} transform="rotate(8 205 300)" />
      {/* arm */}
      <g className="wi-hand">
        <path d="M216 248 L248 284 L300 288" fill="none" stroke="#E2336A" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="303" cy="288" r="7" fill={SKIN} />
      </g>
      {/* neck + head */}
      <rect x="208" y="212" width="13" height="20" rx="4" fill={SKIN} />
      {head}
      </g>

      {/* ticking clock badge on the window corner */}
      <g filter="url(#wi-soft)">
        <circle cx="446" cy="24" r="20" fill="#fff" />
      </g>
      <circle cx="446" cy="24" r="14" fill="none" stroke={LINE} strokeWidth="2" />
      <line className="wi-hr" x1="446" y1="24" x2="446" y2="16" stroke={NAVY} strokeWidth="2.4" strokeLinecap="round" />
      <line className="wi-min" x1="446" y1="24" x2="446" y2="13" stroke={PINK} strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="446" cy="24" r="2" fill={NAVY} />

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
  --neutral-50:  #FAFAF9; --accent-700: #080066;  --accent-600: #0A0082;
  --accent-100: #E6E5F7;  --error-600: #DC2626;   --error-50: #FFF5F5;
  --navy: #0A174E; --navy-2: #263383; --pink: #FF3D72; --magenta: #B83280; --page: #F4F6FC;
  --ff: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --ff-h: 'Poppins', 'Inter', sans-serif;
  font-family: var(--ff); background: var(--page);
}
@keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
@keyframes illusIn { from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:translateX(0)} }
.login-page-container .lp-grad-bg{background:linear-gradient(125deg,#EEF0FB 0%,#E4E3F8 25%,#F4F6FC 45%,#FBE6EE 70%,#E8ECFA 100%);background-size:300% 300%;animation:gradShift 20s ease-in-out infinite}
.login-page-container .lp-illus{flex:0 0 auto;width:clamp(300px,24vw,470px);animation:illusIn 900ms cubic-bezier(.16,1,.3,1) 300ms both}
.login-page-container .lp-illus svg{width:100%;height:auto;display:block}
@media (max-width:1280px){.login-page-container .lp-illus{display:none}}
@keyframes wiBar   { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(.68)} }
@keyframes wiDonut { 0%{stroke-dashoffset:76} 35%,85%{stroke-dashoffset:0} 100%{stroke-dashoffset:76} }
@keyframes wiSteam { 0%{opacity:0;transform:translateY(4px)} 30%{opacity:.8} 100%{opacity:0;transform:translateY(-14px)} }
@keyframes wiSway  { 0%,100%{transform:rotate(-3deg)} 50%{transform:rotate(3deg)} }
@keyframes wiType  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
@keyframes wiBlink { 0%,92%,100%{transform:scaleY(1)} 95%{transform:scaleY(.1)} }
@keyframes wiSpin  { to{transform:rotate(360deg)} }
@keyframes wiBlob  { 0%,100%{transform:rotate(0deg) scale(1)} 50%{transform:rotate(6deg) scale(1.04)} }
.login-page-container .wi-bar{transform-box:fill-box;transform-origin:50% 100%;animation:wiBar 3.4s ease-in-out infinite}
.login-page-container .wi-donut{animation:wiDonut 6s cubic-bezier(.16,1,.3,1) infinite}
.login-page-container .wi-steam{animation:wiSteam 2.6s ease-out infinite both}
.login-page-container .wi-plant{transform-box:fill-box;transform-origin:50% 100%;animation:wiSway 4.5s ease-in-out infinite}
.login-page-container .wi-hand{animation:wiType .45s ease-in-out infinite}
.login-page-container .wi-eye{transform-box:fill-box;transform-origin:center;animation:wiBlink 4.5s ease-in-out infinite}
.login-page-container .wi-min{transform-origin:446px 24px;animation:wiSpin 6s linear infinite}
.login-page-container .wi-hr{transform-origin:446px 24px;animation:wiSpin 72s linear infinite}
@keyframes wiWalk {
  0%   { transform:translate(-110px,0); opacity:1 }
  45%  { transform:translate(120px,0) }
  68%  { transform:translate(120px,0) }
  80%  { transform:translate(205px,0) }
  86%  { transform:translate(205px,16px); opacity:1 }
  87.5%,100% { transform:translate(205px,16px); opacity:0 }
}
@keyframes wiLegF { 0%{transform:rotate(24deg)} 11%{transform:rotate(-24deg)} 22%{transform:rotate(24deg)} 33%{transform:rotate(-24deg)} 45%,68%{transform:rotate(0)} 74%{transform:rotate(-22deg)} 80%{transform:rotate(0)} 86%,100%{transform:rotate(-80deg)} }
@keyframes wiLegB { 0%{transform:rotate(-24deg)} 11%{transform:rotate(24deg)} 22%{transform:rotate(-24deg)} 33%{transform:rotate(24deg)} 45%,68%{transform:rotate(0)} 74%{transform:rotate(22deg)} 80%{transform:rotate(0)} 86%,100%{transform:rotate(-80deg)} }
@keyframes wiArmF { 0%{transform:rotate(-24deg)} 11%{transform:rotate(24deg)} 22%{transform:rotate(-24deg)} 33%{transform:rotate(24deg)} 45%,80%{transform:rotate(0)} 86%,100%{transform:rotate(-45deg)} }
@keyframes wiProfile { 0%,44%{opacity:1} 46%,66%{opacity:0} 68%,100%{opacity:1} }
@keyframes wiFrontV  { 0%,44%{opacity:0} 46%,66%{opacity:1} 68%,100%{opacity:0} }
@keyframes wiWaveF   { from{transform:rotate(-165deg)} to{transform:rotate(-125deg)} }
@keyframes wiArmB { 0%{transform:rotate(24deg)} 11%{transform:rotate(-24deg)} 22%{transform:rotate(24deg)} 33%{transform:rotate(-24deg)} 45%,100%{transform:rotate(0)} }
@keyframes wiHi    { 0%,46%{opacity:0;transform:translateY(8px) scale(.8)} 50%,64%{opacity:1;transform:translateY(0) scale(1)} 68%,100%{opacity:0;transform:translateY(-6px) scale(.95)} }
@keyframes wiSitIn { 0%,86%{opacity:0;transform:translateY(-4px)} 87.5%{opacity:1;transform:translateY(-2px)} 91%{transform:translateY(2px)} 95%,100%{opacity:1;transform:translateY(0)} }
.login-page-container .wi-walker{animation:wiWalk 5.2s ease-in-out .7s both}
.login-page-container .wi-profile{animation:wiProfile 5.2s linear .7s both}
.login-page-container .wi-front{animation:wiFrontV 5.2s linear .7s both}
.login-page-container .wi-wave{transform-box:view-box;transform-origin:0 0;animation:wiWaveF .32s ease-in-out infinite alternate}
.login-page-container .wi-leg,.login-page-container .wi-arm{transform-box:view-box;transform-origin:0 0}
.login-page-container .wi-leg{animation:wiLegF 5.2s linear .7s both}
.login-page-container .wi-leg.back{animation-name:wiLegB}
.login-page-container .wi-arm{animation:wiArmF 5.2s ease-in-out .7s both}
.login-page-container .wi-arm.back{animation-name:wiArmB}
.login-page-container .wi-hi{transform-box:fill-box;transform-origin:10% 100%;animation:wiHi 5.2s ease-out .7s both}
.login-page-container .wi-sitter{animation:wiSitIn 5.2s ease-out .7s both}
.login-page-container .wi-blobshape{transform-box:fill-box;transform-origin:center;animation:wiBlob 14s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.login-page-container .lp-grad-bg{animation:none}}
.login-page-container .head-font{font-family:var(--ff-h)}
@keyframes panelL  { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
@keyframes panelR  { from{opacity:0;transform:translateX(20px)}  to{opacity:1;transform:translateX(0)} }
@keyframes fadeUp  { from{opacity:0;transform:translateY(10px)}  to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn  { from{opacity:0} to{opacity:1} }
@keyframes slideUp { from{opacity:0;transform:translateY(4px)}   to{opacity:1;transform:translateY(0)} }
@keyframes shake   { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)} 60%{transform:translateX(-3px)} 80%{transform:translateX(3px)} }
@keyframes dot     { 0%,80%,100%{transform:translateY(0);opacity:.4} 40%{transform:translateY(-6px);opacity:1} }
@keyframes svcIn   { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
@keyframes lineUp  { from{transform:translateY(105%)} to{transform:translateY(0)} }
@keyframes wsShine { 0%{background-position:100% 0} 100%{background-position:-100% 0} }
@keyframes capIn   { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
@keyframes fillX   { from{transform:scaleX(0)} to{transform:scaleX(1)} }
.login-page-container .ws-line{display:block;overflow:hidden;padding-bottom:.06em}
.login-page-container .ws-line > span{display:inline-block;background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:lineUp 900ms cubic-bezier(.16,1,.3,1) both,wsShine 7s ease-in-out 1.4s infinite}
.login-page-container .ws-line:nth-child(1) > span{background-image:linear-gradient(100deg,var(--navy-2) 0%,var(--navy-2) 42%,#5B66B8 50%,var(--navy-2) 58%,var(--navy-2) 100%)}
.login-page-container .ws-line:nth-child(2) > span{animation-delay:120ms,1.9s;background-image:linear-gradient(100deg,var(--pink) 0%,var(--pink) 42%,#FF8AAA 50%,var(--pink) 58%,var(--pink) 100%)}
.login-page-container .svc-tile{width:38px;height:38px;border-radius:9px;background:#fff;border:1px solid var(--neutral-200);display:flex;align-items:center;justify-content:center;box-shadow:0 1px 2px rgba(12,10,9,.05);color:var(--neutral-600);position:relative;overflow:hidden;transition:all 380ms cubic-bezier(.16,1,.3,1)}
.login-page-container .svc-label{font-size:10px;font-weight:500;color:var(--neutral-500);letter-spacing:.06em;text-transform:uppercase;transition:color 380ms ease}
.login-page-container .svc-item .svc-tile,.login-page-container .svc-item .svc-label{opacity:.55;transition:opacity 380ms ease,all 380ms cubic-bezier(.16,1,.3,1)}
.login-page-container .svc-item.active .svc-tile{opacity:1;transform:translateY(-3px);border-color:var(--accent-600);color:var(--accent-600);box-shadow:0 0 0 4px rgba(10,0,130,.08),0 8px 18px -8px rgba(10,0,130,.4)}
.login-page-container .svc-item.active .svc-label{opacity:1;color:var(--neutral-800)}
.login-page-container .svc-fill{position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--pink);transform-origin:left;animation:fillX linear both}
.login-page-container .svc-cap{font-size:13px;color:var(--neutral-500);min-height:20px;margin-top:18px;animation:capIn 420ms cubic-bezier(.16,1,.3,1) both}
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
.login-page-container .svc-item{cursor:pointer}
.login-page-container .shake{animation:shake 380ms cubic-bezier(0.4,0,0.2,1) both !important}
.login-page-container .btn-ms{width:100%;height:48px;background:var(--navy);color:#fff;border:none;border-radius:6px;display:flex;align-items:center;justify-content:center;gap:10px;font-size:14px;font-weight:500;font-family:var(--ff);letter-spacing:.005em;cursor:pointer;transition:transform 140ms cubic-bezier(.34,1.56,.64,1),box-shadow 140ms ease,background 120ms ease}
.login-page-container .btn-ms:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 18px rgba(10,23,78,.3);background:#081534}
.login-page-container .btn-ms:active:not(:disabled){transform:translateY(0);box-shadow:none}
.login-page-container .btn-ms:disabled{opacity:.6;cursor:not-allowed}
.login-page-container .btn-ms:focus-visible{outline:2px solid var(--accent-600);outline-offset:2px}
.login-page-container .btn-primary{width:100%;height:48px;background:var(--accent-600);color:#fff;border:none;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:600;font-family:var(--ff);letter-spacing:.01em;cursor:pointer;transition:transform 140ms cubic-bezier(.34,1.56,.64,1),box-shadow 140ms ease,background 120ms ease}
.login-page-container .btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(10,0,130,.3);background:var(--accent-700)}
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
      const t = performance.now() / 1000;
      for (const dot of dots) {
        // slow diagonal light wave across the grid
        const w = Math.pow((Math.sin(t * 0.9 - (dot.ox + dot.oy) * 0.006) + 1) / 2, 6);
        // Paves-tinted dots: light lavender-grey, wave brightens toward navy
        const cr = Math.round(214 - 60 * w), cg = Math.round(218 - 58 * w), cb = Math.round(236 - 30 * w);
        const dx = dot.ox - mx, dy = dot.oy - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxD = 140;
        if (dist < maxD) {
          const f = (maxD - dist) / maxD;
          ctx.fillStyle = `rgb(${Math.round(214 - (214 - 255) * f)},${Math.round(218 - (218 - 61) * f)},${Math.round(236 - (236 - 114) * f)})`;
          const angle = Math.atan2(dy, dx);
          dot.x += (dot.ox + Math.cos(angle) * f * 15 - dot.x) * 0.2;
          dot.y += (dot.oy + Math.sin(angle) * f * 15 - dot.y) * 0.2;
        } else {
          ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
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

  // highlighted service on the left panel (auto-cycles, pauses on hover)
  const [activeSvc, setActiveSvc] = useState(0);
  const [svcPaused, setSvcPaused] = useState(false);
  useEffect(() => {
    if (svcPaused) return;
    const id = setInterval(() => setActiveSvc((i) => (i + 1) % SERVICES.length), SVC_CYCLE_MS);
    return () => clearInterval(id);
  }, [svcPaused]);

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
      <div className="left-panel lp-grad-bg panel-l" style={{ width: "55%", height: "100vh", borderRight: "1px solid #E3E6F2", display: "flex", flexDirection: "column", padding: "48px", position: "relative", overflow: "hidden" }}>
        <InteractiveGrid />
        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <img src="/logo.png" alt="Logo" style={{ width: "48px", height: "48px", objectFit: "contain", borderRadius: "10px", flexShrink: 0 }} />
            <span className="head-font" style={{ fontSize: "20px", fontWeight: 600, color: "var(--navy)", letterSpacing: "-0.01em" }}>Paves Enterprise App</span>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "32px" }}>
          <div style={{ display: "flex", flexDirection: "column", flex: "1 1 0", minWidth: 0 }}>
            <div className="head-font" style={{ fontSize: "84px", fontWeight: 700, lineHeight: 0.95, letterSpacing: "-0.04em", marginBottom: "40px", userSelect: "none", pointerEvents: "none" }}>
              <span className="ws-line"><span>Work</span></span>
              <span className="ws-line"><span>Space</span></span>
            </div>
            <h1 className="head-font" style={{ fontSize: "24px", fontWeight: 600, color: "var(--navy)", letterSpacing: "-0.015em", lineHeight: 1.3, marginBottom: "14px" }}>Your organization's<br />operational hub</h1>
            <p style={{ fontSize: "14px", color: "#5B6479", lineHeight: 1.7, maxWidth: "440px", marginBottom: "40px" }}>Manage leave, track timesheets, handle projects, and access all your internal tools through a single gateway.</p>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }} onMouseLeave={() => setSvcPaused(false)}>
              {SERVICES.map(({ label, d }, i) => (
                <div key={label} className={`svc-item${i === activeSvc ? " active" : ""}`}
                  onMouseEnter={() => { setSvcPaused(true); setActiveSvc(i); }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "7px" }}>
                  <div className="svc-tile">
                    <SvcIcon d={d} />
                    {i === activeSvc && !svcPaused && (
                      <span key={`fill-${activeSvc}`} className="svc-fill" style={{ animationDuration: `${SVC_CYCLE_MS}ms` }} />
                    )}
                  </div>
                  <span className="svc-label">{label}</span>
                </div>
              ))}
            </div>
            <div key={activeSvc} className="svc-cap">{SERVICE_DESC[SERVICES[activeSvc].label]}</div>
          </div>
          <div className="lp-illus">
            <WorkIllustration />
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
                <span style={{ display: "block", width: "32px", height: "4px", borderRadius: "4px", background: "linear-gradient(90deg,var(--accent-600),var(--pink))", marginBottom: "18px" }} />
                <h2 className="head-font" style={{ fontSize: "28px", fontWeight: 600, color: "var(--navy)", letterSpacing: "-0.015em", lineHeight: 1.2, marginBottom: "8px" }}>Welcome back</h2>
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
                <span style={{ display: "block", width: "32px", height: "4px", borderRadius: "4px", background: "linear-gradient(90deg,var(--accent-600),var(--pink))", marginBottom: "18px" }} />
                <h2 className="head-font" style={{ fontSize: "28px", fontWeight: 600, color: "var(--navy)", letterSpacing: "-0.015em", lineHeight: 1.2, marginBottom: "8px" }}>Reset password</h2>
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