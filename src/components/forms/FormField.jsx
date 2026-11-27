import React from "react";
import FormLabel from "./FormLabel";
import FormError from "./FormError";
import FormHelperText from "./FormHelperText";

// Wraps an arbitrary field control (Input, Select, custom widget) with a
// consistent label / error / helper-text layout. Does not render an input
// itself — pass one as `children`.
export default function FormField({ label, htmlFor, required, error, helperText, children, className = "" }) {
  return (
    <div className={`space-y-1 ${className}`.trim()}>
      <FormLabel htmlFor={htmlFor} required={required}>
        {label}
      </FormLabel>
      {children}
      {error ? <FormError>{error}</FormError> : <FormHelperText>{helperText}</FormHelperText>}
    </div>
  );
}
