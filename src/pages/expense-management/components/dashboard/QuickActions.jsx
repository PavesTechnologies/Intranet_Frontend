import React from "react";
import { useNavigate } from "react-router-dom";
import { Banknote, Bell, ClipboardCheck, FileText, Clock3, ReceiptText, ScanLine, Settings, Shield, LayoutGrid, Wallet } from "lucide-react";
import SectionCard from "@/components/ui/SectionCard";
import QuickActionCard from "@/components/ui/QuickActionCard";
import { useAuth } from "@/contexts/AuthContext";

// Shared quick actions for every role's dashboard. An action is shown only when the role can open its route;
// `roles` on each action mirrors that route's guard in App.jsx. Tones rotate so neighbouring cards look distinct.

const ICONS = { Banknote, Bell, ClipboardCheck, FileText, Clock3, ReceiptText, ScanLine, Settings, Shield, Wallet };
const TONE_ORDER = ["navy", "pink", "teal", "amber"];

export default function QuickActions({ actions = [], title = "Quick actions", subtitle = "Frequently used actions" }) {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const visible = actions.filter((a) => !a.roles || hasRole(a.roles));
  if (!visible.length) return null;
  return (
    <SectionCard title={title} subtitle={subtitle} icon={LayoutGrid} tone="navy" data-quick-actions>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {visible.map((a, i) => (
          <QuickActionCard
            key={a.key || a.label}
            icon={ICONS[a.icon] || FileText}
            label={a.label}
            hint={a.hint}
            tone={a.tone || TONE_ORDER[i % TONE_ORDER.length]}
            data-quick-action={a.key}
            onClick={() => navigate(a.to)}
          />
        ))}
      </div>
    </SectionCard>
  );
}
