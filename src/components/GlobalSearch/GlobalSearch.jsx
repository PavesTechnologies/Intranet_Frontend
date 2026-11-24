import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, User, CornerDownLeft, Loader2 } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { isFinanceEnabled } from "../../utils/applicationRoutes";
import api from "../../api/axiosInstance";
import { buildPageIndex, searchPages, searchPeople } from "./searchIndex";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** Employee list for people search — the same endpoint the header and Employee Directory already use. */
async function fetchPeople() {
  const res = await api.get(
    `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
  );
  const employees = Array.isArray(res.data) ? res.data : res.data?.data || [];
  return employees
    .map((emp) => ({
      id: `person:${emp.employee_uuid || emp.employee_id}`,
      name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
      email: emp.work_email || emp.email || "",
      employeeId: emp.employee_id ? String(emp.employee_id) : "",
    }))
    .filter((p) => p.name);
}

/**
 * Global search for the whole intranet: pages across every module the user can
 * open (same gating as the sidebar) plus people from the employee directory.
 * Opens from the header button or Ctrl/⌘+K; ↑/↓ to move, Enter to open, Esc to close.
 */
const GlobalSearch = () => {
  const navigate = useNavigate();
  const { user, hasRole, hasAnyPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Roles/permissions only change with the token, so rebuild the index per user.
  const pages = useMemo(
    () => buildPageIndex({ hasRole, hasAnyPermission, financeEnabled: isFinanceEnabled() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user],
  );

  // Fetched on first open only, then cached for the session.
  const { data: people = [], isLoading: peopleLoading, isError: peopleError } = useQuery({
    queryKey: ["global-search", "people"],
    queryFn: fetchPeople,
    enabled: open && Boolean(user),
    staleTime: 10 * 60 * 1000,
  });

  const trimmed = query.trim();
  const pageResults = useMemo(
    () => (trimmed ? searchPages(pages, trimmed) : []),
    [pages, trimmed],
  );
  const peopleResults = useMemo(
    () => (trimmed.length >= 2 ? searchPeople(people, trimmed) : []),
    [people, trimmed],
  );

  // One flat list drives keyboard navigation across both sections.
  const results = useMemo(
    () => [
      ...pageResults.map((item) => ({ type: "page", item })),
      ...peopleResults.map((item) => ({ type: "person", item })),
    ],
    [pageResults, peopleResults],
  );

  useEffect(() => setActiveIndex(0), [trimmed]);

  // Ctrl/⌘+K toggles from anywhere.
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Wait for the dialog to mount before focusing.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-result-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const openResult = (result) => {
    if (!result) return;
    setOpen(false);
    if (result.type === "page") {
      navigate(result.item.path);
    } else {
      // The directory is the read-only people view every user can open; it picks up ?q= as its search.
      navigate(`/employee-onboarding/employee-directory?q=${encodeURIComponent(result.item.name)}`);
    }
  };

  const onInputKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      openResult(results[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const renderRow = (result, index) => {
    const active = index === activeIndex;
    const isPage = result.type === "page";
    const { item } = result;
    const subtitle = isPage
      ? [item.module, ...item.trail].join(" › ")
      : [item.email, item.employeeId && `ID ${item.employeeId}`].filter(Boolean).join(" · ");
    const Icon = isPage ? FileText : User;
    return (
      <li key={item.id} role="option" aria-selected={active}>
        <button
          type="button"
          data-result-index={index}
          onMouseMove={() => setActiveIndex(index)}
          onClick={() => openResult(result)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
            active ? "bg-[#f4f6fc] text-[#263383]" : "text-gray-700"
          }`}
        >
          <span
            className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md ${
              active ? "bg-[#263383] text-white" : "bg-gray-100 text-gray-500"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{item.label || item.name}</span>
            {subtitle && <span className="block truncate text-xs text-gray-500">{subtitle}</span>}
          </span>
          {active && <CornerDownLeft className="h-4 w-4 flex-shrink-0 text-gray-400" />}
        </button>
      </li>
    );
  };

  const shortcut = isMac ? "⌘K" : "Ctrl K";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-tour="header-search"
        aria-label="Search the intranet"
        className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 transition-colors hover:border-[#263383]/40 hover:bg-white"
      >
        <Search className="h-4 w-4 flex-shrink-0" />
        <span className="flex-1 truncate text-left">Search intranet…</span>
        <kbd className="hidden flex-shrink-0 whitespace-nowrap rounded border border-gray-200 bg-white px-1.5 py-0.5 font-sans text-[11px] font-medium leading-none text-gray-400 md:inline-block">
          {shortcut}
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[1000] flex items-start justify-center bg-[#081534]/40 px-4 pt-[12vh]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Global search"
              className="w-full max-w-xl overflow-hidden rounded-xl border border-gray-200 bg-white"
              style={{ boxShadow: "0 16px 48px rgba(8,21,52,0.22)" }}
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center gap-3 border-b border-gray-100 px-4">
                <Search className="h-5 w-5 flex-shrink-0 text-gray-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Search pages and people…"
                  aria-label="Search pages and people"
                  role="combobox"
                  aria-expanded={results.length > 0}
                  aria-controls="global-search-results"
                  className="h-12 flex-1 border-0 bg-transparent text-sm text-[#081534] outline-none placeholder:text-gray-400 focus:ring-0"
                />
                <kbd className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">Esc</kbd>
              </div>

              <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2" id="global-search-results" role="listbox">
                {!trimmed && (
                  <p className="px-3 py-6 text-center text-sm text-gray-500">
                    Search for any page in the intranet, or a colleague by name, email or employee ID.
                  </p>
                )}

                {pageResults.length > 0 && (
                  <section>
                    <h3 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Pages</h3>
                    <ul>{pageResults.map((item, i) => renderRow({ type: "page", item }, i))}</ul>
                  </section>
                )}

                {trimmed.length >= 2 && (peopleResults.length > 0 || peopleLoading || peopleError) && (
                  <section>
                    <h3 className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">People</h3>
                    {peopleLoading && (
                      <p className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading directory…
                      </p>
                    )}
                    {peopleError && !peopleLoading && (
                      <p className="px-3 py-2 text-sm text-gray-500">Couldn't load the employee directory.</p>
                    )}
                    <ul>
                      {peopleResults.map((item, i) => renderRow({ type: "person", item }, pageResults.length + i))}
                    </ul>
                  </section>
                )}

                {trimmed && results.length === 0 && !peopleLoading && (
                  <p className="px-3 py-6 text-center text-sm text-gray-500">
                    No results for “{trimmed}”.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalSearch;
