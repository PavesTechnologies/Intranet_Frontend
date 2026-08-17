import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  APKpiGrid,
  AttentionQueue,
  DashboardHeader,
  InvoiceProcessingTube,
  FinancialHealthTube,
  InvoiceIntakeHealth,
} from "../components/APDashboardComponents";

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
  const [isLoading, setIsLoading] =
    useState(true);

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

    window.setTimeout(() => {
      setIsLoading(false);
    }, 900);
  }, []);

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
          isLoading={isLoading}
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