import { useId } from "react";

// Mini, chibi version of the walk-in girl on the login page (LoginPage.jsx → WorkIllustration),
// shown as a character inside the chat. Same palette as the login illustration.
const NAVY = "#0A174E";
const NAVY2 = "#263383";
const PINK = "#FF3D72";
const SLEEVE = "#E2336A";
const SKIN = "#F3C6A8";
const HAIR = "#1C1840";
const LINE = "#D5D9EC";
const LIP = "#C9826A";
const MOUTH = "#B5566A";

const css = `
@keyframes pgBlink   { 0%,90%,100%{transform:scaleY(1)} 94%{transform:scaleY(.1)} }
@keyframes pgWave    { from{transform:rotate(-160deg)} to{transform:rotate(-120deg)} }
@keyframes pgBob     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-2px)} }
@keyframes pgBreathe { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-1.2px)} }
@keyframes pgGlance  { 0%,70%,100%{transform:rotate(0)} 78%,86%{transform:rotate(-6deg)} }
@keyframes pgTilt    { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-6deg)} }
@keyframes pgHop     { 0%,100%{transform:translateY(0)} 22%{transform:translateY(-8px)} 42%{transform:translateY(0)} 55%{transform:translateY(-3px)} 68%{transform:translateY(0)} }
@keyframes pgThumb   { 0%,100%{transform:rotate(0)} 50%{transform:rotate(-12deg)} }
@keyframes pgSteam   { 0%{opacity:0;transform:translateY(2px)} 35%{opacity:.9} 100%{opacity:0;transform:translateY(-6px)} }
@keyframes pgPeekIn  { from{transform:translateY(30px)} to{transform:translateY(4px)} }
@keyframes pgPeekSway{ 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(4deg)} }
@keyframes pgFadeIn  { from{opacity:0} to{opacity:1} }
.paves-girl .pg-eyes{transform-box:fill-box;transform-origin:center;animation:pgBlink 4.5s ease-in-out infinite}
.paves-girl .pg-wave{transform-box:view-box;transform-origin:42px 60px;animation:pgWave .4s ease-in-out infinite alternate}
.paves-girl .pg-body.bob{animation:pgBob 2.6s ease-in-out infinite}
.paves-girl .pg-body.breathe{animation:pgBreathe 3.4s ease-in-out infinite}
.paves-girl .pg-body.hop{animation:pgHop 1.3s ease-out infinite}
.paves-girl .pg-head.glance{transform-box:view-box;transform-origin:32px 52px;animation:pgGlance 7s ease-in-out infinite}
.paves-girl .pg-head.think{transform-box:view-box;transform-origin:32px 52px;animation:pgTilt 1.6s ease-in-out infinite}
.paves-girl .pg-thumb{transform-box:view-box;transform-origin:41px 60px;animation:pgThumb .65s ease-in-out infinite}
.paves-girl .pg-steam{animation:pgSteam 2.2s ease-out infinite both}
.paves-girl .pg-steam.s2{animation-delay:1.1s}
.paves-girl .pg-peek{animation:pgPeekIn .6s cubic-bezier(.34,1.56,.64,1) both}
.paves-girl .pg-peek-sway{transform-box:view-box;transform-origin:32px 52px;animation:pgPeekSway 3.2s ease-in-out .6s infinite}
.paves-girl .pg-grip{animation:pgFadeIn .3s ease .35s both}
@media (prefers-reduced-motion:reduce){.paves-girl *{animation:none !important}}
`;

/** Head with hair bun; `face` = smile | think | happy */
function Head({ face = "smile" }) {
  return (
    <>
      <circle cx="32" cy="29" r="19" fill={HAIR} />
      <circle cx="32" cy="9" r="7.5" fill={HAIR} />
      <circle cx="32" cy="33" r="15" fill={SKIN} />
      <path d="M16 30 Q18.5 15 32 15 Q45.5 15 48 30 Q42.5 21 32 21 Q21.5 21 16 30 Z" fill={HAIR} />
      {face === "happy" ? (
        // closed, smiling eyes  ^ ^
        <>
          <path d="M23.6 35.8 Q26 32.6 28.4 35.8" fill="none" stroke={NAVY} strokeWidth="1.7" strokeLinecap="round" />
          <path d="M35.6 35.8 Q38 32.6 40.4 35.8" fill="none" stroke={NAVY} strokeWidth="1.7" strokeLinecap="round" />
        </>
      ) : (
        <g className="pg-eyes">
          <circle cx="26" cy="35" r="2.4" fill={NAVY} />
          <circle cx="38" cy="35" r="2.4" fill={NAVY} />
          <circle cx="26.8" cy="34.2" r="0.8" fill="#fff" />
          <circle cx="38.8" cy="34.2" r="0.8" fill="#fff" />
        </g>
      )}
      <circle cx="22" cy="40.5" r="2.8" fill={PINK} opacity=".35" />
      <circle cx="42" cy="40.5" r="2.8" fill={PINK} opacity=".35" />
      {face === "think" && <path d="M30 42.5 Q32.5 41.5 35 42" fill="none" stroke={LIP} strokeWidth="1.5" strokeLinecap="round" />}
      {face === "smile" && <path d="M28.8 41 Q32 44.5 35.2 41" fill="none" stroke={LIP} strokeWidth="1.5" strokeLinecap="round" />}
      {face === "happy" && <path d="M28.4 40.4 Q32 41.2 35.6 40.4 Q35.2 45.8 32 45.8 Q28.8 45.8 28.4 40.4 Z" fill={MOUTH} />}
    </>
  );
}

const Arm = ({ d }) => <path d={d} fill="none" stroke={SLEEVE} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />;
const Hand = ({ cx, cy, r = 3 }) => <circle cx={cx} cy={cy} r={r} fill={SKIN} />;
const RESTING_LEFT = (
  <>
    <Arm d="M23 60 L18 73 L18 79" />
    <Hand cx={18} cy={81} />
  </>
);
const RESTING_RIGHT = (
  <>
    <Arm d="M41 60 L46 73 L46 79" />
    <Hand cx={46} cy={81} />
  </>
);

/** Only her head peeking over an edge, hands gripping it. */
function Peek({ height, className }) {
  const clip = `pg-clip-${useId().replace(/:/g, "")}`;
  const width = (height * 64) / 54;
  return (
    <svg width={width} height={height} viewBox="0 0 64 54" aria-hidden="true" className={`paves-girl ${className}`}>
      <style>{css}</style>
      <defs>
        <clipPath id={clip}>
          <rect x="0" y="0" width="64" height="50" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g className="pg-peek">
          <g className="pg-peek-sway">
            <Head face="smile" />
          </g>
        </g>
      </g>
      {/* fingers gripping the edge */}
      <g className="pg-grip">
        <circle cx="19" cy="50" r="2.4" fill={SKIN} />
        <circle cx="23" cy="50" r="2.4" fill={SKIN} />
        <circle cx="41" cy="50" r="2.4" fill={SKIN} />
        <circle cx="45" cy="50" r="2.4" fill={SKIN} />
      </g>
    </svg>
  );
}

/**
 * @param {"idle"|"mug"|"wave"|"think"|"happy"|"peek"} pose
 *   idle  = standing still, breathing, the odd glance
 *   mug   = standing still holding a steaming mug
 *   wave  = waves hello
 *   think = hand on chin, head tilting (assistant is typing)
 *   happy = little hop + thumbs-up (answer arrived)
 *   peek  = only her head peeking over an edge
 */
export default function AssistantCharacter({ height = 56, pose = "idle", className = "" }) {
  if (pose === "peek") return <Peek height={height} className={className} />;

  const width = (height * 64) / 110;
  const bodyAnim = { wave: "bob", happy: "hop" }[pose] || "breathe";
  const headAnim = pose === "think" ? "think" : pose === "idle" || pose === "mug" ? "glance" : "";
  const face = pose === "think" ? "think" : pose === "happy" ? "happy" : "smile";

  return (
    <svg width={width} height={height} viewBox="0 0 64 110" aria-hidden="true" className={`paves-girl ${className}`}>
      <style>{css}</style>
      {/* floor shadow */}
      <ellipse cx="32" cy="106" rx="16" ry="2.5" fill={NAVY} opacity=".1" />

      <g className={`pg-body ${bodyAnim}`}>
        {/* legs + shoes */}
        <rect x="23" y="80" width="7" height="22" rx="3.5" fill={NAVY2} />
        <rect x="34" y="80" width="7" height="22" rx="3.5" fill={NAVY2} />
        <rect x="20" y="99" width="11" height="5" rx="2.5" fill={NAVY} />
        <rect x="33" y="99" width="11" height="5" rx="2.5" fill={NAVY} />

        {RESTING_LEFT}

        {/* torso */}
        <rect x="20" y="53" width="24" height="31" rx="11" fill={PINK} />

        {(pose === "idle") && RESTING_RIGHT}

        {pose === "wave" && <g className="pg-wave">{RESTING_RIGHT}</g>}

        {pose === "happy" && (
          // thumbs-up: bent arm, fist with the thumb pointing up
          <g className="pg-thumb">
            <Arm d="M41 60 L48 68 L49 58" />
            <Hand cx={49} cy={55} r={3.4} />
            <ellipse cx="48.6" cy="50.6" rx="1.3" ry="2.3" fill={SKIN} />
          </g>
        )}

        {pose === "mug" && (
          <>
            {/* steam */}
            <path className="pg-steam" d="M32 61 q-1.6 -2 0 -4 t0 -4" fill="none" stroke="#B6BCD6" strokeWidth="1.2" strokeLinecap="round" />
            <path className="pg-steam s2" d="M35.5 61 q-1.6 -2 0 -4 t0 -4" fill="none" stroke="#B6BCD6" strokeWidth="1.2" strokeLinecap="round" />
            {/* mug */}
            <path d="M38.5 65.5 q3.6 0 3.6 3 t-3.6 3" fill="none" stroke={LINE} strokeWidth="1.4" />
            <rect x="29" y="63" width="10" height="10.5" rx="2" fill="#fff" stroke={LINE} strokeWidth="1.2" />
            <rect x="29.6" y="66.5" width="8.8" height="2" fill={PINK} opacity=".85" />
            {/* arm holding it */}
            <Arm d="M41 60 L45 71 L39 71.5" />
            <Hand cx={37.5} cy={71} />
          </>
        )}

        {/* neck + head */}
        <rect x="29" y="49" width="6" height="7" rx="2" fill={SKIN} />
        <g className={`pg-head ${headAnim}`}>
          <Head face={face} />
        </g>

        {pose === "think" && (
          // hand on chin (drawn over the torso and face)
          <>
            <Arm d="M41 60 L45 68 L38 52" />
            <Hand cx={37} cy={49} />
          </>
        )}
      </g>
    </svg>
  );
}
