import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  APKpiGrid,
  AttentionQueue,
  DashboardHeader,
  InvoiceProcessingTube,
  FinancialHealthTube,
  InvoiceIntakeHealth,
} from "../components/APDashboardComponents";

import { AP_ROUTES } from "../../constants/routes";
import { formatDate } from "../../utils/formatters";
import {
  DEFAULT_NOTIFICATION_FILTERS,
  useNotifications,
} from "../../notifications/hooks/useNotifications";
import {
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  entityReference,
  isActionRequired,
  resolveNotificationRoute,
} from "../../notifications/constants/notifications";

/* -------------------------------------------------------------------------- */
/* Requires Attention                                                         */
/*                                                                            */
/* Fed by the SAME notification query - and the same cache entry - as the      */
/* header bell and the Notification Center: no second API, no fabricated rows. */
/* It is a shortcut into the Center (the card links straight through), not a   */
/* copy of it: only the few highest-priority items that still need an action   */
/* are shown, from every AP module. "Still needs an action" is backend state - */
/* unresolved and action-oriented - so a read item the user has not dealt with */
/* stays, and resolved work never resurfaces.                                 */
/* -------------------------------------------------------------------------- */

const ATTENTION_LIMIT = 4;

function toAttentionItems(notifications) {
  const priorityRank = (priority) => {
    const index = PRIORITY_ORDER.indexOf(priority);
    return index === -1 ? PRIORITY_ORDER.length : index;
  };

  return [...notifications]
    .filter(isActionRequired)
    .sort((a, b) => {
      const byPriority = priorityRank(a.priority) - priorityRank(b.priority);
      if (byPriority !== 0) return byPriority;
      // Newest first within a priority.
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    })
    .slice(0, ATTENTION_LIMIT)
    .map((notification) => ({
      id: notification.id,
      reference: entityReference(notification) || notification.title,
      module: notification.module,
      priority: notification.priority,
      priorityLabel: PRIORITY_LABEL[notification.priority] || notification.priority,
      title: notification.title,
      message: notification.message,
      timestamp: formatDate(notification.created_at),
      route: resolveNotificationRoute(notification),
    }));
}

/* -------------------------------------------------------------------------- */
/* Dashboard Sections                                                         */
/* -------------------------------------------------------------------------- */

function useDashboardSections() {
  const [autoActiveSection, setAutoActiveSection] =
    useState("processing");

  const [manualSection, setManualSection] =
    useState(null);

  const [manuallyClosedSection, setManuallyClosedSection] =
    useState(null);

  const sectionRefs = useRef({});

  const viewportTimer = useRef(null);

  const scrollTimer = useRef(null);

  /* ---------------------------------------------------------------------- */
  /* Register section                                                       */
  /* ---------------------------------------------------------------------- */

  const registerSection = useCallback(
    (id) => (element) => {
      sectionRefs.current[id] = element;
    },
    []
  );

  /* ---------------------------------------------------------------------- */
  /* Automatic viewport navigation                                         */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    /*
     * Manual mode takes priority.
     */
    if (manualSection) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const visibleSections =
            entries
              .filter(
                (entry) =>
                  entry.isIntersecting
              )
              .sort(
                (a, b) =>
                  b.intersectionRatio -
                  a.intersectionRatio
              );

          if (
            !visibleSections.length
          ) {
            return;
          }

          /*
           * Don't automatically reopen a section
           * that the user explicitly closed.
           */
          const nextEntry =
            visibleSections.find(
              (entry) =>
                entry.target.dataset
                  .section !==
                manuallyClosedSection
            );

          if (!nextEntry) {
            return;
          }

          const nextSection =
            nextEntry.target.dataset
              .section;

          if (!nextSection) {
            return;
          }

          if (
            nextSection ===
            autoActiveSection
          ) {
            return;
          }

          if (viewportTimer.current) {
            clearTimeout(
              viewportTimer.current
            );
          }

          /*
           * Small delay prevents aggressive
           * open/close while scrolling.
           */
          viewportTimer.current =
            window.setTimeout(() => {
              setAutoActiveSection(
                nextSection
              );

              /*
               * Once user reaches another section,
               * release the old manual-close state.
               */
              if (
                manuallyClosedSection &&
                manuallyClosedSection !==
                  nextSection
              ) {
                setManuallyClosedSection(
                  null
                );
              }
            }, 180);
        },
        {
          /*
           * Central viewport zone.
           */
          rootMargin:
            "-35% 0px -45% 0px",

          threshold: [
            0.25,
            0.5,
            0.75,
          ],
        }
      );

    Object.values(
      sectionRefs.current
    ).forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();

      if (viewportTimer.current) {
        clearTimeout(
          viewportTimer.current
        );
      }
    };
  }, [
    manualSection,
    manuallyClosedSection,
    autoActiveSection,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Scroll expanded card into view                                        */
  /* ---------------------------------------------------------------------- */

  const scrollSectionIntoView =
    useCallback((id) => {
      if (scrollTimer.current) {
        clearTimeout(
          scrollTimer.current
        );
      }

      scrollTimer.current =
        window.setTimeout(() => {
          const element =
            sectionRefs.current[id];

          if (!element) {
            return;
          }

          element.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 220);
    }, []);

  /* ---------------------------------------------------------------------- */
  /* Manual open / close                                                    */
  /* ---------------------------------------------------------------------- */

  const toggleManualSection =
    useCallback(
      (id) => {
        /*
         * Clicking the currently open manual card
         * closes it.
         */
        if (manualSection === id) {
          setManualSection(null);

          /*
           * Prevent viewport observer from immediately
           * opening the same card again.
           */
          setManuallyClosedSection(id);

          return;
        }

        /*
         * Open selected card manually.
         */
        setManualSection(id);

        setManuallyClosedSection(null);

        setAutoActiveSection(id);

        scrollSectionIntoView(id);
      },
      [
        manualSection,
        scrollSectionIntoView,
      ]
    );

  /* ---------------------------------------------------------------------- */
  /* Determine active section                                               */
  /* ---------------------------------------------------------------------- */

  let activeSection = null;

  /*
   * Manual open has highest priority.
   */
  if (manualSection) {
    activeSection = manualSection;
  }

  /*
   * User manually closed currently active section.
   */
  else if (
    manuallyClosedSection ===
    autoActiveSection
  ) {
    activeSection = null;
  }

  /*
   * Normal automatic mode.
   */
  else {
    activeSection =
      autoActiveSection;
  }

  /* ---------------------------------------------------------------------- */
  /* Cleanup                                                                 */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (viewportTimer.current) {
        clearTimeout(
          viewportTimer.current
        );
      }

      if (scrollTimer.current) {
        clearTimeout(
          scrollTimer.current
        );
      }
    };
  }, []);

  return {
    activeSection,
    manualSection,
    registerSection,
    toggleManualSection,
  };
}

/* -------------------------------------------------------------------------- */
/* Dashboard Page                                                             */
/* -------------------------------------------------------------------------- */

export default function APDashboardPage() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] =
    useState(true);

  /*
   * The signed-in user's unified notification stream - the same query the
   * header bell and Notification Center use, so this adds no request of its own.
   */
  const {
    notifications,
    isLoading: notificationsLoading,
    isError: notificationsError,
    refetch: refetchNotifications,
  } = useNotifications(DEFAULT_NOTIFICATION_FILTERS);

  const attentionItems = toAttentionItems(notifications);

  const {
    activeSection,
    manualSection,
    registerSection,
    toggleManualSection,
  } =
    useDashboardSections();

  /* ---------------------------------------------------------------------- */
  /* Refresh                                                                 */
  /* ---------------------------------------------------------------------- */

  const handleRefresh = useCallback(() => {
    setIsLoading(true);

    refetchNotifications();

    window.setTimeout(() => {
      setIsLoading(false);
    }, 900);
  }, [refetchNotifications]);

  /* ---------------------------------------------------------------------- */
  /* Initial loading                                                         */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setIsLoading(false);
      }, 900);

    return () =>
      window.clearTimeout(timer);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-full bg-slate-50/60 p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-[1800px] space-y-4">

        {/* ================================================================ */}
        {/* HEADER                                                           */}
        {/* ================================================================ */}

        <DashboardHeader
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />

        {/* ================================================================ */}
        {/* COMPACT KPI SUMMARY                                              */}
        {/* ================================================================ */}

        <APKpiGrid
          isLoading={isLoading}
        />

        {/* ================================================================ */}
        {/* REQUIRES ATTENTION                                               */}
        {/* ================================================================ */}

        <AttentionQueue
          isLoading={isLoading || notificationsLoading}
          isError={notificationsError}
          items={attentionItems}
          onRetry={refetchNotifications}
          onViewAll={() => navigate(AP_ROUTES.NOTIFICATIONS)}
          onSelect={(item) =>
            navigate(item.route || AP_ROUTES.NOTIFICATIONS)
          }
        />

        {/* ================================================================ */}
        {/* PROCESSING HEALTH                                                */}
        {/* ================================================================ */}

        <div
          ref={registerSection(
            "processing"
          )}
          data-section="processing"
        >
          <InvoiceProcessingTube
            isLoading={isLoading}
            isActive={
              activeSection ===
              "processing"
            }
            isManual={
              manualSection ===
              "processing"
            }
            onToggle={() =>
              toggleManualSection(
                "processing"
              )
            }
          />
        </div>

        {/* ================================================================ */}
        {/* CASH & PAYMENT HEALTH                                            */}
        {/* ================================================================ */}

        <div
          ref={registerSection(
            "financial"
          )}
          data-section="financial"
        >
          <FinancialHealthTube
            isLoading={isLoading}
            isActive={
              activeSection ===
              "financial"
            }
            isManual={
              manualSection ===
              "financial"
            }
            onToggle={() =>
              toggleManualSection(
                "financial"
              )
            }
          />
        </div>

        {/* ================================================================ */}
        {/* INVOICE INTAKE HEALTH                                            */}
        {/* ================================================================ */}

        <InvoiceIntakeHealth
          isLoading={isLoading}
        />

      </div>
    </div>
  );
}