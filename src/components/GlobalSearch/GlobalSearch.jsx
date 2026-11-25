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
 * Shows as a single icon in the header that expands inline into a search field
 * (click or Ctrl/⌘+K); ↑/↓ to move, Enter to open, Esc / click outside to collapse.
 */
const GlobalSearch = () => {
  const navigate = useNavigate();
  const { user, hasRole, hasAnyPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const rootRef = useRef(null);

  // Clicking anywhere outside the expanded search collapses it back to the icon.
  useEffect(() => {
    if (!open) return undefined;
    const onMouseDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

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
    <div ref={rootRef} data-tour="header-search" className="relative flex w-full max-w-md justify-end">
      {/* Collapsed: a single icon. Expanded: the box grows leftwards into a search field. */}
      <div
        className={`flex h-9 items-center overflow-hidden rounded-lg border transition-[width,background-color,border-color] duration-200 ease-out ${
          open
            ? "w-full gap-2 border-[#263383]/40 bg-white px-3"
            : "w-9 border-transparent bg-transparent hover:bg-gray-100"
        }`}
      >
        {open ? (
          <>
            <Search className="h-4 w-4 flex-shrink-0 text-gray-400" />
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
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-[#081534] outline-none placeholder:text-gray-400 focus:ring-0"
            />
            <kbd className="hidden flex-shrink-0 rounded border border-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 sm:inline-block">
              Esc
            </kbd>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Search the intranet"
            title={`Search (${shortcut})`}
            className="flex h-full w-full items-center justify-center text-gray-700"
          >
            <Search className="h-5 w-5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
            <motion.div
              role="dialog"
              aria-label="Global search"
              className="absolute right-0 top-full z-[1000] mt-2 w-full min-w-[20rem] overflow-hidden rounded-xl border border-gray-200 bg-white"
              style={{ boxShadow: "0 16px 48px rgba(8,21,52,0.22)" }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
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
        )}
      </AnimatePresence>
    </div>
  );
};

export default GlobalSearch;
