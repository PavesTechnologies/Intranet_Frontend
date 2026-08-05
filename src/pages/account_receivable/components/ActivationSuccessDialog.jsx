import { CheckCircle2 } from "lucide-react";

import Button from "../../../components/Button/Button";
import { Fonts } from "../../../components/Fonts/Fonts";

export default function ActivationSuccessDialog({ isOpen, projectName, clientName, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </span>
          <h3 className={`${Fonts.heading4} mt-4`}>Billing Setup Activated</h3>
          <p className="mt-1 text-sm text-slate-500">
            The project billing configuration has been activated and is now ready for billing data
            acquisition.
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500">Client</span>
            <span className="font-medium text-slate-900">{clientName || "—"}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500">Project</span>
            <span className="font-medium text-slate-900">{projectName || "—"}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-500">Billing Context</span>
            <span className="font-medium text-emerald-700">Activated</span>
          </div>
        </div>

        <Button variant="primary" className="mt-5 w-full" onClick={onClose}>
          Go to Billing Workspace
        </Button>
      </div>
    </div>
  );
}
