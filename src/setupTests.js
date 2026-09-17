// Vitest global setup — extends `expect` with jest-dom matchers (toBeInTheDocument, etc.)
// for every test file, and provides window.__APP_CONFIG__ since production code reads it
// directly at module load time (see public/config.js, loaded via index.html in the real app).
import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined" && !window.__APP_CONFIG__) {
  window.__APP_CONFIG__ = {
    AP_BASE_URL: "http://localhost:8000/apm",
    USER_MANAGEMENT_URL: "http://localhost:8000/ums",
  };
}

// jsdom has no ResizeObserver — @headlessui/react's Listbox uses one internally to reposition
// its options panel, which throws "ResizeObserver is not defined" the moment a Listbox opens.
if (typeof window !== "undefined" && !window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
