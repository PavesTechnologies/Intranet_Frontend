import React from "react";
import { Inbox } from "lucide-react";
import { Fonts } from "../Fonts/Fonts";

export default function EmptyState({ icon, title, description, action, className = "" }) {
  const Icon = icon || Inbox;

  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-12 text-center ${className}`.trim()}>
      <div className="mb-1 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        {React.isValidElement(Icon) ? Icon : <Icon className="h-8 w-8" aria-hidden="true" />}
      </div>
      {title ? <p className={Fonts.subheading}>{title}</p> : null}
      {description ? <p className="max-w-sm text-sm text-gray-500">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
