import React from "react";

// Legacy zero-prop loader, kept for its existing consumers. Restyled onto the
// brand spinner color used by LoadingSpinner so the two no longer disagree
// (this one previously rendered gray/black). For new code, prefer
// src/components/patterns/Loaders.jsx (PageLoader / InlineLoader).
const Loader = () => {
  return (
    <div className="flex justify-center items-center py-10">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary"></div>
    </div>
  );
};

export default Loader;
