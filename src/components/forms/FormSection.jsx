import React from "react";
import { Fonts } from "../Fonts/Fonts";

export default function FormSection({ title, description, children, className = "" }) {
  return (
    <div className={`space-y-4 ${className}`.trim()}>
      {(title || description) && (
        <div>
          {title ? <h3 className={Fonts.subheading}>{title}</h3> : null}
          {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
