import { useCallback, useEffect, useRef, useState } from "react";

import {
  APKpiGrid,
  AttentionQueue,
  DashboardHeader,
  InvoiceProcessingTube,
  FinancialHealthTube,
  ExceptionTube,
  VendorExposureTube,
  InvoiceIntakeQuality,
} from "../components/APDashboardComponents";

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const SECTION_IDS = [
  "processing",
  "financial",
  "exceptions",
  "vendors",
];

/*
 * Delay before viewport navigation decides which section
 * should become active.
 *
 * This prevents rapid switching when the user is scrolling.
 */
const VIEWPORT_SETTLE_DELAY = 180;

/*
 * Wait for the dropdown expansion animation to begin,
 * then bring the expanded section into view.
 */
const SCROLL_DELAY = 180;

/* -------------------------------------------------------------------------- */
/* Dashboard Section Controller                                               */
/* -------------------------------------------------------------------------- */

function useDashboardSections() {
  const [autoActiveSection, setAutoActiveSection] =
    useState("processing");

  /*
   * Section currently opened manually.
   * null = no manual section.
   */
  const [manualSection, setManualSection] =
    useState(null);

  /*
   * Section that the user explicitly closed.
   *
   * This is important because otherwise the viewport
   * observer will immediately reopen the same section.
   */
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
  /* Automatic viewport detection                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    /*
     * While a section is manually opened,
     * automatic viewport navigation is paused.
     */
    if (manualSection) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter(
            (entry) => entry.isIntersecting
          )
          .sort(
            (a, b) =>
              b.intersectionRatio -
              a.intersectionRatio
          );

        if (!visibleSections.length) {
          return;
        }

        /*
         * Find the strongest visible section.
         *
         * If the currently closed section is still
         * visible, don't immediately reopen it.
         */
        const nextEntry =
          visibleSections.find(
            (entry) =>
              entry.target.dataset.section !==
              manuallyClosedSection
          );

        if (!nextEntry) {
          return;
        }

        const nextSection =
          nextEntry.target.dataset.section;

        if (!nextSection) {
          return;
        }

        /*
         * Avoid unnecessary state changes.
         */
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

        viewportTimer.current =
          window.setTimeout(() => {
            setAutoActiveSection(
              nextSection
            );

            /*
             * Once the user has moved to another
             * section, the old manual-close restriction
             * can be removed.
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
         * Central viewport area.
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
  /* Scroll section into view                                                */
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
        }, 180);
    }, []);

  /* ---------------------------------------------------------------------- */
  /* Manual open / close                                                    */
  /* ---------------------------------------------------------------------- */

  const toggleManualSection =
    useCallback(
      (id) => {
        /*
         * ---------------------------------------------------------------
         * CASE 1
         * The same section is manually open.
         *
         * Clicking it again = CLOSE.
         * ---------------------------------------------------------------
         */
        if (manualSection === id) {
          setManualSection(null);

          /*
           * Remember that the user explicitly closed this
           * section so the viewport observer doesn't
           * immediately reopen it.
           */
          setManuallyClosedSection(id);

          return;
        }

        /*
         * ---------------------------------------------------------------
         * CASE 2
         * User opens a section manually.
         * ---------------------------------------------------------------
         */

        setManualSection(id);

        /*
         * Remove any previous manual-close restriction.
         */
        setManuallyClosedSection(null);

        /*
         * Make this section the active section.
         */
        setAutoActiveSection(id);

        /*
         * Give React time to render the expanded
         * content before scrolling.
         */
        scrollSectionIntoView(id);
      },
      [
        manualSection,
        scrollSectionIntoView,
      ]
    );

  /* ---------------------------------------------------------------------- */
  /* Active section                                                          */
  /* ---------------------------------------------------------------------- */

  let activeSection = null;

  /*
   * Manual section always wins.
   */
  if (manualSection) {
    activeSection = manualSection;
  }

  /*
   * If the user explicitly closed the automatically
   * active section, keep it closed.
   */
  else if (
    manuallyClosedSection ===
    autoActiveSection
  ) {
    activeSection = null;
  }

  /*
   * Otherwise automatic viewport mode.
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
    manuallyClosedSection,
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

        {/* Header */}
        <DashboardHeader
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />

        {/* Compact KPI cards */}
        <APKpiGrid
          isLoading={isLoading}
        />

        {/* Attention */}
        <AttentionQueue
          isLoading={isLoading}
        />

        {/* -------------------------------------------------------------- */}
        {/* Interactive insight cards                                      */}
        {/* -------------------------------------------------------------- */}

        <div className="space-y-2.5">

          {/* Processing */}
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

          {/* Financial */}
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

          {/* Exceptions */}
          <div
            ref={registerSection(
              "exceptions"
            )}
            data-section="exceptions"
          >
            <ExceptionTube
              isLoading={isLoading}
              isActive={
                activeSection ===
                "exceptions"
              }
              isManual={
                manualSection ===
                "exceptions"
              }
              onToggle={() =>
                toggleManualSection(
                  "exceptions"
                )
              }
            />
          </div>

          {/* Vendors */}
          <div
            ref={registerSection(
              "vendors"
            )}
            data-section="vendors"
          >
            <VendorExposureTube
              isLoading={isLoading}
              isActive={
                activeSection ===
                "vendors"
              }
              isManual={
                manualSection ===
                "vendors"
              }
              onToggle={() =>
                toggleManualSection(
                  "vendors"
                )
              }
            />
          </div>

        </div>

        {/* Intake quality */}
        <InvoiceIntakeQuality
          isLoading={isLoading}
        />

      </div>
    </div>
  );
}