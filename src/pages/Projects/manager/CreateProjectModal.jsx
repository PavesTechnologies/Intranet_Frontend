import React, { useEffect, useState, useCallback } from "react";
import api from "../../../api/axiosInstance";
import { showStatusToast } from "../../../components/toastfy/toast";
import { motion, AnimatePresence } from "motion/react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  GripVertical,
  Trash2,
  Plus,
  Check,
  Search,
  RotateCcw,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

/* ─── Font ────────────────────────────────────────────────────────────────── */
if (!document.getElementById("pmw-font")) {
  const l = document.createElement("link");
  l.id = "pmw-font";
  l.rel = "stylesheet";
  l.href =
    "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap";
  document.head.appendChild(l);
}

/* ─── Global CSS ──────────────────────────────────────────────────────────── */
const CSS = `
  .pmw * { box-sizing: border-box; }
  .pmw, .pmw input, .pmw select, .pmw textarea, .pmw button {
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  .pmw-input, .pmw-select, .pmw-textarea {
    font-size: 13.5px; color: #111827;
    background: #fff; border: 1.5px solid #e2e8f0;
    border-radius: 8px; outline: none;
    width: 100%; transition: border-color .15s, box-shadow .15s;
  }
  .pmw-input, .pmw-select { height: 40px; padding: 0 12px; }
  .pmw-select {
    appearance: none; cursor: pointer; padding-right: 32px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 12px center;
  }
  .pmw-textarea { padding: 10px 12px; min-height: 82px; resize: vertical; line-height: 1.55; }
  .pmw-input:focus,.pmw-select:focus,.pmw-textarea:focus {
    border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.12);
  }
  .pmw-input.err,.pmw-select.err,.pmw-textarea.err {
    border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,.12);
  }
  .pmw-input::placeholder,.pmw-textarea::placeholder { color: #9ca3af; }
  .pmw-label {
    display: block; font-size: 11px; font-weight: 600;
    color: #6b7280; text-transform: uppercase;
    letter-spacing: .06em; margin-bottom: 5px;
  }
  .pmw-label .req { color: #ef4444; margin-left: 2px; }
  .pmw-label .opt { color: #9ca3af; font-weight: 400; text-transform: none; letter-spacing: 0; font-size: 10.5px; margin-left: 4px; }
  .pmw-err { font-size: 11px; color: #ef4444; font-weight: 500; overflow: hidden; display: block; }
  .pmw-divider { height: 1px; background: #f1f5f9; margin: 18px 0; }
  .pmw-g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .pmw-g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
  .pmw-sec { font-size: 10px; font-weight: 700; color: #c4cdd9; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 12px; }
  @keyframes pmw-sh { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
  .pmw-skel {
    background: linear-gradient(90deg,#f1f5f9 25%,#e9eef5 50%,#f1f5f9 75%);
    background-size: 800px 100%; animation: pmw-sh 1.4s infinite linear; border-radius: 7px;
  }
  .pmw-sbtn {
    display:flex;flex-direction:column;gap:2px;
    padding:9px 16px 9px 20px;position:relative;
    text-align:left;background:transparent;border:none;width:100%;cursor:default;
  }
  .pmw-sbtn.done{cursor:pointer;}
  .pmw-sbtn.done:hover{background:rgba(37,99,235,.04);}
  .pmw-sbtn.active::before {
    content:'';position:absolute;left:0;top:0;bottom:0;
    width:3px;background:#2563eb;border-radius:0 2px 2px 0;
  }
  .pmw-mrow {
    display:flex;align-items:center;gap:10px;padding:8px 12px;
    cursor:pointer;transition:background .12s;border-bottom:1px solid #f8fafc;
  }
  .pmw-mrow:last-child{border-bottom:none;}
  .pmw-mrow:hover{background:#f8fafc;}
  .pmw-mrow.sel{background:#eff6ff;}
  .pmw-mrow.dis{opacity:.38;cursor:not-allowed;pointer-events:none;}
  .pmw-srow {
    display:flex;align-items:center;gap:10px;padding:9px 12px;
    background:#fff;border:1.5px solid #e9eef5;border-radius:8px;
    user-select:none;
  }
  .pmw-srow:hover{border-color:#d1d9e4;}
  .pmw-btn-cancel {
    font-size:13px;font-weight:500;border:none;background:transparent;
    color:#6b7280;cursor:pointer;padding:7px 13px;border-radius:8px;
    transition:background .15s,color .15s;
  }
  .pmw-btn-cancel:hover{background:#f3f4f6;color:#374151;}
  .pmw-btn-back {
    font-size:13px;font-weight:500;border:1.5px solid #e2e8f0;background:#fff;
    color:#374151;cursor:pointer;padding:7px 15px;border-radius:8px;
    transition:background .15s,border-color .15s;
  }
  .pmw-btn-back:hover{background:#f8fafc;border-color:#cbd5e1;}
  .pmw-btn-primary {
    font-size:13px;font-weight:600;border:none;background:#2563eb;
    color:#fff;cursor:pointer;padding:7px 18px;border-radius:8px;
    transition:background .15s,opacity .15s;
    display:flex;align-items:center;gap:5px;
  }
  .pmw-btn-primary:hover:not(:disabled){background:#1d4ed8;}
  .pmw-btn-primary:disabled{opacity:.6;cursor:not-allowed;}
  .pmw-btn-discard {
    font-size:13px;font-weight:600;border:none;background:#ef4444;
    color:#fff;cursor:pointer;padding:7px 16px;border-radius:8px;
    transition:background .15s;
  }
  .pmw-btn-discard:hover{background:#dc2626;}
  .pmw-add-inp {
    flex:1;height:40px;padding:0 12px;font-size:13.5px;color:#111827;
    background:#fff;border:1.5px solid #e2e8f0;border-radius:8px;outline:none;
    transition:border-color .15s,box-shadow .15s;
  }
  .pmw-add-inp:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12);}
  .pmw-add-inp::placeholder{color:#9ca3af;}
  .pmw-add-btn {
    height:40px;padding:0 14px;font-size:13px;font-weight:600;
    border:1.5px solid #2563eb;background:#eff6ff;color:#2563eb;
    border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:5px;
    transition:background .15s;white-space:nowrap;
  }
  .pmw-add-btn:hover{background:#dbeafe;}
  .pmw-srch {
    height:40px;width:100%;box-sizing:border-box;padding:0 12px 0 34px;
    font-size:13.5px;color:#111827;background:#fff;
    border:1.5px solid #e2e8f0;border-radius:8px;outline:none;
    transition:border-color .15s,box-shadow .15s;
  }
  .pmw-srch:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,.12);}
  .pmw-srch::placeholder{color:#9ca3af;}
  .pmw-scroll::-webkit-scrollbar{width:4px;}
  .pmw-scroll::-webkit-scrollbar-track{background:transparent;}
  .pmw-scroll::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:10px;}
  .pmw-scroll::-webkit-scrollbar-thumb:hover{background:#cbd5e1;}
  .pmw-rcell{display:flex;flex-direction:column;gap:3px;}
  .pmw-rlabel{font-size:10px;font-weight:600;color:#a0aec0;text-transform:uppercase;letter-spacing:.06em;}
  .pmw-rval{font-size:13px;color:#111827;font-weight:400;}
  .pmw-rempty{font-size:13px;color:#d1d5db;font-style:italic;}
  .pmw-badge{
    display:inline-flex;align-items:center;gap:5px;
    font-size:11.5px;font-weight:600;border-radius:5px;
    padding:3px 9px;border-width:1.5px;border-style:solid;
  }
`;

if (!document.getElementById("pmw-styles")) {
  const s = document.createElement("style");
  s.id = "pmw-styles";
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* ─── Constants ───────────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: "Core Details", desc: "Name, key, location" },
  { id: 2, label: "Lifecycle", desc: "Dates, stage, delivery" },
  { id: 3, label: "Team", desc: "Owner, managers, members" },
  { id: 4, label: "Workflow", desc: "Task statuses" },
  { id: 5, label: "Review", desc: "Confirm and submit" },
];

const DEFAULT_FORM = {
  name: "",
  projectKey: "",
  description: "",
  primaryLocation: "",
  status: "PLANNING",
  currentStage: "INITIATION",
  deliveryModel: "ONSITE",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  riskLevel: "",
  priorityLevel: "",
  projectBudget: "",
  projectBudgetCurrency: "USD",
  ownerId: "",
  clientId: "",
  rmId: "",
  deliveryOwnerId: "",
  memberIds: [],
};

const DEFAULT_STATUSES = [
  { id: "def-1", name: "To Do", color: "#9ca3af" },
  { id: "def-2", name: "In Progress", color: "#3b82f6" },
  { id: "def-3", name: "Done", color: "#22c55e" },
];

const STEP_REQ = {
  1: ["name", "projectKey", "primaryLocation"],
  2: [
    "status",
    "currentStage",
    "deliveryModel",
    "startDate",
    "riskLevel",
    "priorityLevel",
  ],
  3: ["ownerId", "rmId", "deliveryOwnerId"],
  4: [],
  5: [],
};

const FIELD_LABELS = {
  name: "Project name",
  projectKey: "Project key",
  primaryLocation: "Primary location",
  status: "Status",
  currentStage: "Current stage",
  deliveryModel: "Delivery model",
  startDate: "Start date",
  riskLevel: "Risk level",
  priorityLevel: "Priority level",
  ownerId: "Project owner",
  rmId: "Resource manager",
  deliveryOwnerId: "Delivery owner",
};

const STATUS_OPT = ["PLANNING", "ACTIVE", "ARCHIVED", "COMPLETED"];
const STAGE_OPT = [
  "INITIATION",
  "PLANNING",
  "DESIGN",
  "DEVELOPMENT",
  "TESTING",
  "DEPLOYMENT",
  "MAINTENANCE",
  "COMPLETED",
];
const DELIVERY_OPT = ["ONSITE", "OFFSHORE", "HYBRID"];
const RISK_OPT = ["LOW", "MEDIUM", "HIGH"];
const PRI_OPT = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const RISK_B = {
  LOW: { dot: "#16a34a", bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  MEDIUM: { dot: "#d97706", bg: "#fffbeb", text: "#b45309", border: "#fde68a" },
  HIGH: { dot: "#dc2626", bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
};
const PRI_B = {
  LOW: { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
  MEDIUM: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  HIGH: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  CRITICAL: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
};

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const genKey = (name) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const letters = words
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, "")[0] || "")
    .join("")
    .toUpperCase();
  const num = Math.floor(Math.random() * 900) + 100;
  return `${letters}-${num}`;
};

const isDirtyCheck = (form, statuses) => {
  const df = DEFAULT_FORM;
  return (
    form.name !== df.name ||
    form.projectKey !== df.projectKey ||
    form.description !== df.description ||
    form.primaryLocation !== df.primaryLocation ||
    form.endDate !== df.endDate ||
    form.riskLevel !== df.riskLevel ||
    form.priorityLevel !== df.priorityLevel ||
    form.projectBudget !== df.projectBudget ||
    form.ownerId !== df.ownerId ||
    form.clientId !== df.clientId ||
    form.rmId !== df.rmId ||
    form.deliveryOwnerId !== df.deliveryOwnerId ||
    form.memberIds.length > 0 ||
    JSON.stringify(statuses.map((s) => s.name)) !==
      JSON.stringify(DEFAULT_STATUSES.map((s) => s.name))
  );
};

/* ─── Atomic Components ───────────────────────────────────────────────────── */
const ErrMsg = ({ msg }) => (
  <AnimatePresence>
    {msg && (
      <motion.span
        className="pmw-err"
        initial={{ opacity: 0, height: 0, marginTop: 0 }}
        animate={{ opacity: 1, height: "auto", marginTop: 4 }}
        exit={{ opacity: 0, height: 0, marginTop: 0 }}
        transition={{ duration: 0.18 }}
      >
        {msg}
      </motion.span>
    )}
  </AnimatePresence>
);

const Field = ({ label, required, optional, error, children }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    {label && (
      <label className="pmw-label">
        {label}
        {required && <span className="req">*</span>}
        {optional && <span className="opt">(optional)</span>}
      </label>
    )}
    {children}
    <ErrMsg msg={error} />
  </div>
);

const Inp = ({ error, ...p }) => (
  <input className={`pmw-input${error ? " err" : ""}`} {...p} />
);
const Sel = ({ error, children, ...p }) => (
  <select className={`pmw-select${error ? " err" : ""}`} {...p}>
    {children}
  </select>
);
const Txta = ({ error, ...p }) => (
  <textarea className={`pmw-textarea${error ? " err" : ""}`} {...p} />
);

/* ─── Skeleton ────────────────────────────────────────────────────────────── */
const Skel = ({ h = 40, mb = 14 }) => (
  <div className="pmw-skel" style={{ height: h, marginBottom: mb }} />
);
const SkelStep = () => (
  <div>
    <div className="pmw-g2" style={{ marginBottom: 14 }}>
      <Skel h={58} />
      <Skel h={58} />
    </div>
    <Skel h={82} mb={14} />
    <Skel h={58} mb={14} />
    <div className="pmw-g3">
      <Skel h={58} mb={0} />
      <Skel h={58} mb={0} />
      <Skel h={58} mb={0} />
    </div>
  </div>
);

/* ─── Stepper ─────────────────────────────────────────────────────────────── */
const Stepper = ({ cur, goTo }) => (
  <div
    style={{
      width: 210,
      flexShrink: 0,
      background: "#f8fafc",
      borderRight: "1px solid #e9eef5",
      display: "flex",
      flexDirection: "column",
      paddingTop: 20,
      paddingBottom: 20,
      gap: 1,
    }}
  >
    {STEPS.map((s) => {
      const active = cur === s.id,
        done = cur > s.id;
      return (
        <button
          key={s.id}
          type="button"
          className={`pmw-sbtn${active ? " active" : ""}${done ? " done" : ""}`}
          onClick={() => done && goTo(s.id)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <motion.div
              animate={{
                background: active || done ? "#2563eb" : "#e9eef5",
                color: active || done ? "#fff" : "#94a3b8",
              }}
              transition={{ duration: 0.2 }}
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {done ? <Check size={11} strokeWidth={3} /> : s.id}
            </motion.div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <span
                style={{
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 500,
                  lineHeight: 1.3,
                  color: active ? "#111827" : done ? "#374151" : "#94a3b8",
                }}
              >
                {s.label}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  color: active ? "#6b7280" : "#b5bec9",
                }}
              >
                {s.desc}
              </span>
            </div>
          </div>
        </button>
      );
    })}
  </div>
);

/* ─── Review helpers ──────────────────────────────────────────────────────── */
const RBadge = ({ value, s }) =>
  value ? (
    <span
      className="pmw-badge"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {s.dot && (
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: s.dot,
            flexShrink: 0,
          }}
        />
      )}
      {value}
    </span>
  ) : (
    <span className="pmw-rempty">—</span>
  );

const RCell = ({ label, value, badge, bs }) => (
  <div className="pmw-rcell">
    <span className="pmw-rlabel">{label}</span>
    {badge && bs ? (
      <RBadge value={value} s={bs} />
    ) : (
      <span className={value ? "pmw-rval" : "pmw-rempty"}>{value || "—"}</span>
    )}
  </div>
);

/* ─── Unsaved Warning Bar ─────────────────────────────────────────────────── */
const WarnBar = ({ onKeep, onDiscard }) => (
  <motion.div
    initial={{ opacity: 0, y: -12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.2, ease: "easeOut" }}
    style={{
      position: "absolute",
      top: 12,
      left: 16,
      right: 16,
      zIndex: 10,
      background: "#fff",
      border: "1.5px solid #fbbf24",
      borderRadius: 10,
      padding: "12px 16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}
  >
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        flexShrink: 0,
        background: "#fffbeb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <AlertTriangle size={16} color="#d97706" />
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>
        Discard unsaved changes?
      </p>
      <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>
        All your progress will be lost. This cannot be undone.
      </p>
    </div>
    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
      <button
        type="button"
        className="pmw-btn-back"
        onClick={onKeep}
        style={{ padding: "6px 13px", fontSize: 12.5 }}
      >
        Keep Editing
      </button>
      <button
        type="button"
        className="pmw-btn-discard"
        onClick={onDiscard}
        style={{ padding: "6px 13px", fontSize: 12.5 }}
      >
        Discard
      </button>
    </div>
  </motion.div>
);

/* ─── Step 1 ──────────────────────────────────────────────────────────────── */
const Step1 = ({
  fd,
  err,
  onChange,
  onNameChange,
  onKeyChange,
  keyAuto,
  onResetKey,
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div className="pmw-g2">
      <Field label="Project Name" required error={err.name}>
        <Inp
          name="name"
          placeholder="e.g. Apollo Redesign"
          value={fd.name}
          onChange={onNameChange}
          error={err.name}
        />
      </Field>
      <Field label="Project Key" required error={err.projectKey}>
        <div style={{ position: "relative" }}>
          <Inp
            name="projectKey"
            placeholder="AUTO"
            value={fd.projectKey}
            onChange={onKeyChange}
            error={err.projectKey}
            style={{ paddingRight: keyAuto ? 12 : 34 }}
          />
          {!keyAuto && (
            <button
              type="button"
              onClick={onResetKey}
              title="Reset to auto-generate"
              style={{
                position: "absolute",
                right: 9,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
        {keyAuto && (
          <span style={{ fontSize: 10.5, color: "#9ca3af", marginTop: 3 }}>
            Auto-generated from name
          </span>
        )}
      </Field>
    </div>

    <Field label="Description" optional>
      <Txta
        name="description"
        placeholder="Brief overview of scope and goals…"
        value={fd.description}
        onChange={onChange}
      />
    </Field>

    <Field label="Primary Location" required error={err.primaryLocation}>
      <Inp
        name="primaryLocation"
        placeholder="e.g. New York, USA"
        value={fd.primaryLocation}
        onChange={onChange}
        error={err.primaryLocation}
      />
    </Field>
  </div>
);

/* ─── Step 2 ──────────────────────────────────────────────────────────────── */
const Step2 = ({ fd, err, onChange }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div className="pmw-g3">
      <Field label="Status" required error={err.status}>
        <Sel
          name="status"
          value={fd.status}
          onChange={onChange}
          error={err.status}
        >
          {STATUS_OPT.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </Sel>
      </Field>
      <Field label="Current Stage" required error={err.currentStage}>
        <Sel
          name="currentStage"
          value={fd.currentStage}
          onChange={onChange}
          error={err.currentStage}
        >
          {STAGE_OPT.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </Sel>
      </Field>
      <Field label="Delivery Model" required error={err.deliveryModel}>
        <Sel
          name="deliveryModel"
          value={fd.deliveryModel}
          onChange={onChange}
          error={err.deliveryModel}
        >
          {DELIVERY_OPT.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </Sel>
      </Field>
    </div>

    <div className="pmw-divider" />

    <div className="pmw-g2">
      <Field label="Start Date" required error={err.startDate}>
        <Inp
          type="date"
          name="startDate"
          value={fd.startDate}
          onChange={onChange}
          error={err.startDate}
        />
      </Field>
      <Field label="End Date" optional error={err.endDate}>
        <Inp
          type="date"
          name="endDate"
          value={fd.endDate}
          onChange={onChange}
          error={err.endDate}
        />
      </Field>
    </div>

    <div className="pmw-divider" />

    <div className="pmw-g2">
      <Field label="Risk Level" required error={err.riskLevel}>
        <Sel
          name="riskLevel"
          value={fd.riskLevel}
          onChange={onChange}
          error={err.riskLevel}
        >
          <option value="">Select risk level</option>
          {RISK_OPT.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </Sel>
      </Field>
      <Field label="Priority Level" required error={err.priorityLevel}>
        <Sel
          name="priorityLevel"
          value={fd.priorityLevel}
          onChange={onChange}
          error={err.priorityLevel}
        >
          <option value="">Select priority level</option>
          {PRI_OPT.map((v) => (
            <option key={v}>{v}</option>
          ))}
        </Sel>
      </Field>
    </div>

    <AnimatePresence>
      {(fd.riskLevel || fd.priorityLevel) && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          {fd.riskLevel &&
            (() => {
              const s = RISK_B[fd.riskLevel];
              return (
                <span
                  className="pmw-badge"
                  style={{
                    background: s.bg,
                    color: s.text,
                    borderColor: s.border,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: s.dot,
                      flexShrink: 0,
                    }}
                  />
                  Risk: {fd.riskLevel}
                </span>
              );
            })()}
          {fd.priorityLevel &&
            (() => {
              const s = PRI_B[fd.priorityLevel];
              return (
                <span
                  className="pmw-badge"
                  style={{
                    background: s.bg,
                    color: s.text,
                    borderColor: s.border,
                  }}
                >
                  Priority: {fd.priorityLevel}
                </span>
              );
            })()}
        </motion.div>
      )}
    </AnimatePresence>

    <div className="pmw-divider" />

    <Field label="Project Budget" optional>
      <div className="flex items-center gap-2">
        <select
          name="projectBudgetCurrency"
          value={fd.projectBudgetCurrency}
          onChange={onChange}
          style={{
            height: 36,
            padding: "0 8px",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            color: "#334155",
            background: "#f8fafc",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <option value="USD">USD</option>
          <option value="INR">INR</option>
        </select>
        <Inp
          name="projectBudget"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={fd.projectBudget}
          onChange={onChange}
          style={{ maxWidth: 180 }}
        />
      </div>
    </Field>
  </div>
);

/* ─── Step 3 ──────────────────────────────────────────────────────────────── */
const Step3 = ({
  fd,
  err,
   users,
  projectManagers,
  resourceManagers,
  deliveryOwners,
  clients,
  resources,
  onChange,
  onOwner,
  toggleMember,
  search,
  setSearch,
  editingProjectId,
}) => {
  const allUsers = [...projectManagers, ...resourceManagers, ...deliveryOwners];
  const filtered = resources.filter((r) =>
  r?.resourceName?.toLowerCase().includes(search.toLowerCase())
);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="pmw-g2">
        <Field label="Project Owner" required error={err.ownerId}>
          <Sel
            name="ownerId"
            value={fd.ownerId}
            onChange={onOwner}
            error={err.ownerId}
          >
            <option value="">Select owner</option>
            {projectManagers.map((u) => (
  <option key={u.id} value={u.id}>
    {u.name}
  </option>
))}
          </Sel>
        </Field>
        <Field label="Client" required error={err.clientId}>
          <Sel name="clientId" value={fd.clientId} onChange={onChange} error={err.clientId}>
            <option value="">Select client</option>
           {clients.map((c) => (
  <option key={c.clientId} value={c.clientId}>
    {c.clientName}
  </option>
))}
          </Sel>
        </Field>
        <Field label="Resource Manager" required error={err.rmId}>
          <Sel name="rmId" value={fd.rmId} onChange={onChange} error={err.rmId}>
            <option value="">Select resource manager</option>
           {resourceManagers.map((u) => (
  <option key={u.id} value={u.id}>
    {u.name}
  </option>
))}
          </Sel>
        </Field>
        <Field label="Delivery Owner" required error={err.deliveryOwnerId}>
          <Sel
            name="deliveryOwnerId"
            value={fd.deliveryOwnerId}
            onChange={onChange}
            error={err.deliveryOwnerId}
          >
            <option value="">Select delivery owner</option>
            {deliveryOwners.map((u) => (
  <option key={u.id} value={u.id}>
    {u.name}
  </option>
))}
          </Sel>
        </Field>
      </div>

      {editingProjectId && (
        <>
          <div className="pmw-divider" />

          <div>
            <label className="pmw-label" style={{ margin: 0 }}>
              Team Members
            </label>

            <div
              className="pmw-scroll"
              style={{
                border: "1.5px solid #e9eef5",
                borderRadius: 9,
                maxHeight: 200,
                overflowY: "auto",
                background: "#fff",
                marginTop: 10,
              }}
            >
              {resources.length === 0 ? (
                <div
                  style={{
                    padding: 16,
                    textAlign: "center",
                    fontSize: 13,
                    color: "#94a3b8",
                  }}
                >
                  No team members found
                </div>
              ) : (
                resources.map((res) => (
                  <div
                    key={res.resourceId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      borderBottom: "1px solid #f8fafc",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          color: "#111827",
                          fontWeight: 500,
                        }}
                      >
                        {res.resourceName}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#6b7280",
                        }}
                      >
                        {res.resourceRole}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ─── Step 4 — Workflow ───────────────────────────────────────────────────── */
const Step4 = ({ statuses, setStatuses, statusError }) => {
  const [newName, setNewName] = useState("");
  const [dupError, setDupError] = useState(""); // FIX: was missing

  const normalize = (str) => str.trim().replace(/\s+/g, " ").toLowerCase();

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    // This version treats "to do" and "todo" as duplicates
    const normalize = (str) => str.trim().replace(/\s+/g, "").toLowerCase();
    const isDuplicate = statuses.some(
      (s) => normalize(s.name) === normalize(trimmed),
    );

    if (isDuplicate) {
      setDupError("A status with this name already exists.");
      return;
    }

    setDupError("");
    setStatuses((p) => [
      ...p,
      { id: `new-${Date.now()}`, name: trimmed, color: "#9ca3af" },
    ]);
    setNewName("");
  };

  const handleRemove = (id) => setStatuses((p) => p.filter((s) => s.id !== id));

  const onDragEnd = ({ source, destination }) => {
    if (!destination || destination.index === source.index) return;
    const next = Array.from(statuses);
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    setStatuses(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p
        style={{ margin: 0, fontSize: 13, color: "#6b7280", lineHeight: 1.55 }}
      >
        Define the task statuses your team will use. Drag to reorder. You can
        change these later.
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="pmw-add-inp"
          placeholder="New status name, e.g. 'In Review'"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setDupError("");
          }} // FIX: clear error on type
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button type="button" className="pmw-add-btn" onClick={handleAdd}>
          <Plus size={14} /> Add
        </button>
      </div>

      {/* FIX: render both error types */}
      <ErrMsg msg={dupError} />
      <ErrMsg msg={statusError} />

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="statuses-list">
          {(droppableProvided) => (
            <div
              ref={droppableProvided.innerRef}
              {...droppableProvided.droppableProps}
              className="pmw-scroll"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {statuses.map((status, index) => (
                <Draggable
                  key={status.id}
                  draggableId={String(status.id)}
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps} // FIX: entire card is drag target
                      className="pmw-srow"
                      style={{
                        ...provided.draggableProps.style,
                        cursor: snapshot.isDragging ? "grabbing" : "grab",
                        boxShadow: snapshot.isDragging
                          ? "0 8px 24px rgba(0,0,0,0.12)"
                          : "none",
                        borderColor: snapshot.isDragging
                          ? "#93c5fd"
                          : undefined,
                        background: snapshot.isDragging ? "#f8fafc" : "#fff",
                      }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: status.color,
                          flexShrink: 0,
                        }}
                      />
                      {/* grip icon is now decorative only */}
                      <div
                        style={{
                          color: "#c4cdd9",
                          display: "flex",
                          alignItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <GripVertical size={15} />
                      </div>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13.5,
                          color: "#111827",
                          fontWeight: 500,
                        }}
                      >
                        {status.name}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(status.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#c4cdd9",
                          padding: 4,
                          borderRadius: 5,
                          display: "flex",
                          alignItems: "center",
                          transition: "color .15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color = "#ef4444")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color = "#c4cdd9")
                        }
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {droppableProvided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

/* ─── Step 5 — Review ─────────────────────────────────────────────────────── */
const Step5 = ({ fd, statuses, users, clients, resources, projectManagers, resourceManagers, deliveryOwners }) => {
  const allUsers = [...(projectManagers || []), ...(resourceManagers || []), ...(deliveryOwners || []), ...(users || [])];

  const getName = (id) => {
    if (!id) return null;
    const user = allUsers.find((u) => u?.id?.toString() === id?.toString());
    if (user) return user.name;
    const client = clients.find((c) => c?.clientId?.toString() === id?.toString());
    if (client) return client.clientName;
    const resource = resources.find((r) => r?.resourceId?.toString() === id?.toString());
    if (resource) return resource.resourceName;
    return id;
  };
  const memberNames = fd.memberIds.map(getName).filter(Boolean).join(", ");
  const fmtBudget = (v, currency) =>
    v
      ? `${currency || "USD"} ${parseFloat(v).toLocaleString("en-US", { minimumFractionDigits: 2 })}`
      : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <section>
        <p className="pmw-sec">Core Details</p>
        <div className="pmw-g2" style={{ gap: "12px 22px" }}>
          <RCell label="Project Name" value={fd.name} />
          <RCell label="Project Key" value={fd.projectKey} />
          <RCell label="Primary Location" value={fd.primaryLocation} />
          {fd.description && (
            <div style={{ gridColumn: "1/-1" }}>
              <RCell label="Description" value={fd.description} />
            </div>
          )}
        </div>
      </section>
      <div className="pmw-divider" />
      <section>
        <p className="pmw-sec">Lifecycle</p>
        <div className="pmw-g3" style={{ gap: "10px 10px" }}>
          <RCell label="Status" value={fd.status} />
          <RCell label="Stage" value={fd.currentStage} />
          <RCell label="Delivery" value={fd.deliveryModel} />
          <RCell label="Start Date" value={fd.startDate} />
          <RCell label="End Date" value={fd.endDate} />
          <RCell label="Budget" value={fmtBudget(fd.projectBudget, fd.projectBudgetCurrency)} />
          <RCell
            label="Risk"
            value={fd.riskLevel}
            badge
            bs={fd.riskLevel ? RISK_B[fd.riskLevel] : null}
          />
          <RCell
            label="Priority"
            value={fd.priorityLevel}
            badge
            bs={fd.priorityLevel ? PRI_B[fd.priorityLevel] : null}
          />
        </div>
      </section>
      <div className="pmw-divider" />
      <section>
        <p className="pmw-sec">Team</p>
        <div className="pmw-g2" style={{ gap: "12px 22px" }}>
          <RCell label="Owner" value={getName(fd.ownerId)} />
          <RCell label="Client" value={getName(fd.clientId)} />
          <RCell label="Resource Manager" value={getName(fd.rmId)} />
          <RCell label="Delivery Owner" value={getName(fd.deliveryOwnerId)} />
          {memberNames && (
            <div style={{ gridColumn: "1/-1" }}>
              <RCell
                label={`Members (${fd.memberIds.length})`}
                value={memberNames}
              />
            </div>
          )}
        </div>
      </section>
      <div className="pmw-divider" />
      <section>
        <p className="pmw-sec">Workflow Statuses</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {statuses.map((s, i) => (
            <span
              key={s.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 500,
                border: "1.5px solid #e9eef5",
                borderRadius: 6,
                padding: "4px 10px",
                background: "#fff",
                color: "#374151",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: s.color,
                }}
              />
              {s.name}
              <span style={{ fontSize: 10, color: "#c4cdd9", marginLeft: 2 }}>
                #{i + 1}
              </span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};

/* ─── Main Modal ──────────────────────────────────────────────────────────── */
const CreateProjectModal = ({
  isOpen,
  onClose,
  onProjectCreated,
  editingProjectId,
  // FIX: removed formData/initialFormData — modal fetches its own data via API
}) => {
  const [fd, setFd] = useState(DEFAULT_FORM);
  const [statuses, setStatuses] = useState(DEFAULT_STATUSES);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [resources, setResources] = useState([]);
  
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [errors, setErrors] = useState({});
  const [statusErr, setStatusErr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [keyAuto, setKeyAuto] = useState(true);
  const [showWarn, setShowWarn] = useState(false);

const [projectManagers, setProjectManagers] = useState([]);
const [resourceManagers, setResourceManagers] = useState([]);
const [deliveryOwners, setDeliveryOwners] = useState([]);

  const token = localStorage.getItem("token");

  /* ── Open / reset ─────────────────────────────────────────────────────── */
  // FIX: replaced old initialFormData reference with proper API fetch
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setDir(1);
    setErrors({});
    setStatusErr("");
    setSearch("");
    setShowWarn(false);

    if (editingProjectId) {
      setKeyAuto(false);
      setLoading(true);
      Promise.all([
        api.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${editingProjectId}/edit`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
        api.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${editingProjectId}/statuses`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ])
        .then(([projectRes, statusRes]) => {
          const p = projectRes.data;
          setFd({
            name: p.name || "",
            projectKey: p.projectKey || "",
            description: p.description || "",
            status: p.status || "PLANNING",
            currentStage: p.currentStage || "INITIATION",
            deliveryModel: p.deliveryModel || "ONSITE",
            primaryLocation: p.primaryLocation || "",
            riskLevel: p.riskLevel || "",
            priorityLevel: p.priorityLevel || "",
            projectBudget: p.projectBudget ? String(p.projectBudget) : "",
            projectBudgetCurrency: p.projectBudgetCurrency || "USD",
            ownerId: p.ownerId ? String(p.ownerId) : "",
            clientId: p.clientId ? String(p.clientId) : "",
            rmId: p.rmId ? String(p.rmId) : "",
            deliveryOwnerId: p.deliveryOwnerId ? String(p.deliveryOwnerId) : "",
            memberIds: p.memberIds ? Array.from(p.memberIds) : [],
            startDate: p.startDate ? p.startDate.split("T")[0] : "",
            endDate: p.endDate ? p.endDate.split("T")[0] : "",
          });
          const sorted = (statusRes.data || []).sort(
            (a, b) => a.sortOrder - b.sortOrder,
          );
          setStatuses(sorted.length ? sorted : DEFAULT_STATUSES);
        })
        .catch(() => {
          showStatusToast("Failed to load project data.", "error");
          setStatuses(DEFAULT_STATUSES);
        })
        .finally(() => setLoading(false));
    } else {
      setKeyAuto(true);
      setFd({
        ...DEFAULT_FORM,
        startDate: new Date().toISOString().split("T")[0],
      });
      setStatuses(DEFAULT_STATUSES);
    }
  }, [isOpen, editingProjectId]);

  /* ── Fetch users ──────────────────────────────────────────────────────── */
  // useEffect(() => {
  //   if (!isOpen) return;
  //   api
  //     .get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/users?page=0&size=100`, {
  //       headers: { Authorization: `Bearer ${token}` },
  //     })
  //     .then((res) => {
  //       const list = Array.isArray(res.data) ? res.data : res.data?.content;
  //       if (Array.isArray(list)) setUsers(list.filter(Boolean));
  //     })
  //     .catch(console.error);
  // }, [isOpen, token]);

  /* ── Fetch clients ────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isOpen) return;
    api
      .get(`${window.__APP_CONFIG__.RMS_BASE_URL}/api/client/get-active-clients`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
         const list = res.data?.data;
        if (Array.isArray(list)) setClients(list.filter(Boolean));
      })
      .catch(console.error);
  }, [isOpen, token]);

  /* ── Fetch resources ──────────────────────────────────────────────────── */
  useEffect(() => {
  if (!isOpen || !editingProjectId) return;

  api
    .get(`${window.__APP_CONFIG__.RMS_BASE_URL}/api/allocation/get-all-resources/${editingProjectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    .then((res) => {
      const list = res.data?.data;
      if (Array.isArray(list)) setResources(list.filter(Boolean));
    })
    .catch(console.error);
}, [isOpen, editingProjectId]);


  useEffect(() => {
  if (!isOpen) return;

  api.get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/users/project_manager`, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => setProjectManagers(res.data || []))
    .catch(console.error);

  api.get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/users/resource-managers`, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => setResourceManagers(res.data || []))
    .catch(console.error);

  api.get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/users/delivery-owners`, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => setDeliveryOwners(res.data || []))
    .catch(console.error);

}, [isOpen, token]);
  /* ── Handlers ─────────────────────────────────────────────────────────── */
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
      if (name === "projectBudget") {
        if (value === "" || /^\d*\.?\d{0,2}$/.test(value))
          setFd((p) => ({ ...p, projectBudget: value }));
        return;
      }
      setFd((p) => ({ ...p, [name]: value }));
    },
    [errors],
  );

  const handleNameChange = (e) => {
    const raw = e.target.value;
    if (errors.name) setErrors((p) => ({ ...p, name: "" }));
    setFd((p) => ({
      ...p,
      name: raw,
      projectKey: keyAuto ? genKey(raw) : p.projectKey,
    }));
  };

  // FIX: properly wired — disables auto-gen on manual edit
  const handleKeyChange = (e) => {
    setKeyAuto(false);
    if (errors.projectKey) setErrors((p) => ({ ...p, projectKey: "" }));
    setFd((p) => ({
      ...p,
      projectKey: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
    }));
  };

  const resetKeyAuto = () => {
    setKeyAuto(true);
    setFd((p) => ({ ...p, projectKey: genKey(p.name) }));
  };

  const handleOwner = (e) => {
    const id = e.target.value;
    if (errors.ownerId) setErrors((p) => ({ ...p, ownerId: "" }));
    setFd((p) => ({
      ...p,
      ownerId: id,
      memberIds: p.memberIds.filter((m) => m.toString() !== id),
    }));
  };

  const toggleMember = (uid) => {
    if (uid?.toString() === fd.ownerId?.toString()) return;
    setFd((p) => ({
      ...p,
      memberIds: p.memberIds.includes(uid)
        ? p.memberIds.filter((id) => id !== uid)
        : [...p.memberIds, uid],
    }));
  };

  /* ── Dirty check ──────────────────────────────────────────────────────── */
  const requestClose = () => {
    if (isDirtyCheck(fd, statuses)) {
      setShowWarn(true);
    } else {
      onClose();
    }
  };
  const confirmDiscard = () => {
    setShowWarn(false);
    onClose();
  };
  const keepEditing = () => setShowWarn(false);

  /* ── Validate ─────────────────────────────────────────────────────────── */
  const validate = (s) => {
    const errs = {};
    STEP_REQ[s].forEach((f) => {
      if (!fd[f]?.toString().trim()) errs[f] = `${FIELD_LABELS[f]} is required`;
    });
    if (
      s === 2 &&
      fd.startDate &&
      fd.endDate &&
      new Date(fd.endDate) < new Date(fd.startDate)
    )
      errs.endDate = "End date cannot be before start date";
    setErrors(errs);
    if (s === 4) {
      if (statuses.length === 0) {
        setStatusErr("Add at least one status to continue.");
        return false;
      }
      setStatusErr("");
    }
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (validate(step)) {
      setDir(1);
      setStep((s) => s + 1);
    }
  };
  const back = () => {
    setErrors({});
    setStatusErr("");
    setDir(-1);
    setStep((s) => s - 1);
  };
  const goTo = (s) => {
    if (s < step) {
      setDir(-1);
      setStep(s);
    }
  };

  /* ── Submit ───────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    const payload = {
      name: fd.name.trim(),
      projectKey: fd.projectKey.trim(),
      description: fd.description || null,
      status: fd.status,
      currentStage: fd.currentStage,
      deliveryModel: fd.deliveryModel,
      clientId: fd.clientId,
      rmId: parseInt(fd.rmId, 10) || 120,
      deliveryOwnerId: parseInt(fd.deliveryOwnerId, 10) || 120,
      primaryLocation: fd.primaryLocation,
      riskLevel: fd.riskLevel,
      projectBudget: fd.projectBudget ? parseFloat(fd.projectBudget) : null,
      projectBudgetCurrency: fd.projectBudget ? fd.projectBudgetCurrency : null,
      priorityLevel: fd.priorityLevel,
      ownerId: parseInt(fd.ownerId, 10),
      memberIds: fd.memberIds,
      startDate: fd.startDate ? `${fd.startDate}T00:00:00` : null,
      endDate: fd.endDate ? `${fd.endDate}T23:59:59` : null,
    };
    const statusPayload = statuses.map((s, i) => ({
      name: s.name,
      sortOrder: i,
    }));

    try {
      setSubmitting(true);
      let pid = editingProjectId;

      if (editingProjectId) {
        await api.put(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${editingProjectId}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else {
        const res = await api.post(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        pid = res.data?.id;
      }

      try {
        await api.put(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${pid}/statuses`,
          statusPayload,
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } catch {
        showStatusToast(
          "Project saved, but statuses could not be saved — configure them in project settings.",
          "warn",
        );
      }

      showStatusToast(
        editingProjectId
          ? "Project updated successfully."
          : "Project created successfully.",
        "success",
      );

      // FIX: call onProjectCreated BEFORE onClose to avoid calling setState on unmounted component
      if (editingProjectId) {
        onProjectCreated?.();
      } else {
        onProjectCreated?.({ id: pid });
      }

      onClose();
    } catch (err) {
      const b = err.response?.data;
      showStatusToast(
        b?.errors?.[0] || b?.message || "Submission failed. Please try again.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const variants = {
    enter: (d) => ({ opacity: 0, x: d > 0 ? 20 : -20 }),
    center: { opacity: 1, x: 0 },
    exit: (d) => ({ opacity: 0, x: d > 0 ? -20 : 20 }),
  };

  const stepTitles = {
    1: { title: "Core Details", sub: "Start with the project's identity." },
    2: { title: "Lifecycle", sub: "Set dates, stages, risk, and budget." },
    3: {
      title: "Stakeholders & Team",
      sub: "Assign ownership and team members.",
    },
    4: {
      title: "Workflow Setup",
      sub: "Configure the task statuses your team will use.",
    },
    5: {
      title: "Review & Submit",
      sub: "Verify everything before creating the project.",
    },
  };

  const stepContent = {
    1: (
      <Step1
        fd={fd}
        err={errors}
        onChange={handleChange}
        onNameChange={handleNameChange}
        onKeyChange={handleKeyChange}
        keyAuto={keyAuto}
        onResetKey={resetKeyAuto}
      />
    ),
    2: <Step2 fd={fd} err={errors} onChange={handleChange} />,
    3: (
      <Step3
        fd={fd}
        err={errors}
         users={users}
        clients={clients}
        resources={resources}
        onChange={handleChange}
        onOwner={handleOwner}
        toggleMember={toggleMember}
        search={search}
        setSearch={setSearch}
         projectManagers={projectManagers}
  resourceManagers={resourceManagers}
  deliveryOwners={deliveryOwners}
  editingProjectId={editingProjectId}
        
      />
    ),
    4: (
      <Step4
        statuses={statuses}
        setStatuses={setStatuses}
        statusError={statusErr}
      />
    ),
    5: <Step5 fd={fd} statuses={statuses} users={users} clients={clients} resources={resources} projectManagers={projectManagers} resourceManagers={resourceManagers} deliveryOwners={deliveryOwners} />,
  };

  return (
    <motion.div
      className="pmw"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.48)",
        backdropFilter: "blur(3px)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={requestClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18),0 0 0 1px rgba(0,0,0,0.06)",
          width: "100%",
          maxWidth: 860,
          height: 580,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <Stepper cur={step} goTo={goTo} />

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: "18px 26px 14px",
                borderBottom: "1px solid #f1f5f9",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 15.5,
                    fontWeight: 700,
                    color: "#0f172a",
                    letterSpacing: "-.02em",
                  }}
                >
                  {editingProjectId
                    ? `Edit: ${stepTitles[step].title}`
                    : stepTitles[step].title}
                </h2>
                <p
                  style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}
                >
                  {stepTitles[step].sub}
                </p>
              </div>
              <button
                type="button"
                onClick={requestClose}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#94a3b8",
                  fontSize: 20,
                  lineHeight: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background .15s,color .15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f1f5f9";
                  e.currentTarget.style.color = "#374151";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#94a3b8";
                }}
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div
              className="pmw-scroll"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "22px 26px",
                position: "relative",
              }}
            >
              <AnimatePresence>
                {showWarn && (
                  <WarnBar onKeep={keepEditing} onDiscard={confirmDiscard} />
                )}
              </AnimatePresence>

              <AnimatePresence mode="wait" custom={dir}>
                {loading ? (
                  <motion.div
                    key="skel"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <SkelStep />
                  </motion.div>
                ) : (
                  <motion.div
                    key={step}
                    custom={dir}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {stepContent[step]}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            height: 52,
            padding: "0 22px",
            borderTop: "1px solid #e9eef5",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11.5, color: "#94a3b8", fontWeight: 500 }}>
            Step {step} of {STEPS.length}
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              className="pmw-btn-cancel"
              onClick={requestClose}
            >
              Cancel
            </button>
            {step > 1 && (
              <button type="button" className="pmw-btn-back" onClick={back}>
                Back
              </button>
            )}
            {step < STEPS.length ? (
              <button type="button" className="pmw-btn-primary" onClick={next}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                type="button"
                className="pmw-btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? editingProjectId
                    ? "Updating…"
                    : "Creating…"
                  : editingProjectId
                    ? "Update Project"
                    : "Create Project"}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default CreateProjectModal;
