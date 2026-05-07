import React, { useMemo, useState, useEffect } from "react";
import Pagination from "../Pagination/pagination";

/**
 * DynamicCardGrid
 *
 * A fully configurable grid/list layout component.
 *
 * Props:
 * ─────────────────────────────────────────────────────────────────────────────
 * data              {Array}     Items to render.
 * renderCard        {Function}  (item, index, layoutMode) => ReactNode
 * getKey            {Function}  (item, index) => string|number — unique key
 *
 * Layout
 * ──────
 * layoutMode        {"grid"|"list"|"masonry"} Default: "grid"
 * cardsPerRow       {number}    Ideal columns in grid/masonry. Default: 3
 * cardsPerPage      {number}    Items per page. Default: 6
 * minCardWidth      {string}    CSS min width for auto-fit columns. Default: "240px"
 * fixedColumns      {number}    Force an exact column count (overrides auto-fit)
 * listItemHeight    {string}    CSS height for list-mode rows. Default: "auto"
 *
 * Pagination
 * ──────────
 * showPagination    {boolean}   Default: true
 * resetPageDependency {any}     Resets to page 1 when this value changes
 * paginationComponent {ReactNode} Custom pagination component. Receives { currentPage, totalPages, onPrevious, onNext }
 *
 * Empty state
 * ───────────
 * emptyMessage      {string}    Text shown when data is empty.
 * emptyClassName    {string}    Class for the empty state wrapper.
 * renderEmpty       {Function}  () => ReactNode — fully custom empty state.
 *
 * Skeleton loading
 * ────────────────
 * loading           {boolean}   Show skeleton cards instead of data.
 * skeletonCount     {number}    Number of skeleton cards to render. Default: cardsPerPage
 * renderSkeleton    {Function}  () => ReactNode — custom skeleton card.
 *
 * Class overrides
 * ───────────────
 * wrapperClassName  {string}
 * gridClassName     {string}
 * gapClassName      {string}    Default: "gap-6"
 * paginationWrapperClassName {string}
 *
 * Header / Footer slots
 * ─────────────────────
 * renderHeader      {Function}  ({ currentPage, totalPages, totalItems }) => ReactNode
 * renderFooter      {Function}  ({ currentPage, totalPages, totalItems }) => ReactNode
 *
 * Sorting / Grouping (optional helpers passed to renderCard)
 * ──────────────────────────────────────────────────────────
 * sortFn            {Function}  (a, b) => number — sort before paginating
 * groupBy           {Function}  (item) => string — group key extractor
 * renderGroupHeader {Function}  (groupKey, items) => ReactNode
 */

const DynamicCardGrid = ({
  data = [],
  renderCard,
  getKey,

  // Layout
  layoutMode = "grid",
  columnMode = "fixed", // "fixed" | "auto"
  cardsPerRow = 3,
  cardsPerPage = 6,
  minCardWidth = "240px",
  fixedColumns,
  listItemHeight = "auto",

  // Pagination
  showPagination = true,
  resetPageDependency,
  paginationComponent: CustomPagination,

  // Empty state
  emptyMessage = "No records found.",
  emptyClassName = "text-center text-gray-500 py-10 border rounded-xl bg-gray-50",
  renderEmpty,

  // Skeleton
  loading = false,
  skeletonCount,
  renderSkeleton,

  // Class overrides
  wrapperClassName = "",
  gridClassName = "",
  gapClassName = "gap-6",
  paginationWrapperClassName = "mt-6",

  // Slots
  renderHeader,
  renderFooter,

  // Sorting / Grouping
  sortFn,
  groupBy,
  renderGroupHeader,
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  const safeCardsPerRow = Math.max(Number(cardsPerRow) || 1, 1);
  const safeCardsPerPage = Math.max(Number(cardsPerPage) || 1, 1);
  const safeFixedColumns = fixedColumns
    ? Math.max(Number(fixedColumns) || 1, 1)
    : null;

  const processedData = useMemo(() => {
    const items = [...data];
    if (sortFn) items.sort(sortFn);
    return items;
  }, [data, sortFn]);

  const totalPages = Math.max(
    Math.ceil(processedData.length / safeCardsPerPage),
    1
  );

  const paginatedData = useMemo(() => {
    if (!showPagination) return processedData;

    const start = (currentPage - 1) * safeCardsPerPage;
    return processedData.slice(start, start + safeCardsPerPage);
  }, [processedData, currentPage, safeCardsPerPage, showPagination]);

  useEffect(() => {
    setCurrentPage(1);
  }, [resetPageDependency, data]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const gridStyle = useMemo(() => {
    if (layoutMode === "list") return {};

    if (layoutMode === "masonry") {
      return {
        columnCount: safeFixedColumns || safeCardsPerRow,
        columnGap: "1rem",
      };
    }

    if (safeFixedColumns) {
      return {
        gridTemplateColumns: `repeat(${safeFixedColumns}, minmax(0, 1fr))`,
      };
    }

    if (columnMode === "auto") {
      return {
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minCardWidth}), 1fr))`,
      };
    }

    return {
      gridTemplateColumns: `repeat(${safeCardsPerRow}, minmax(0, 1fr))`,
    };
  }, [
    layoutMode,
    columnMode,
    safeFixedColumns,
    safeCardsPerRow,
    minCardWidth,
  ]);

  const gridClasses = `grid ${gapClassName} ${gridClassName}`;

  const defaultSkeleton = () => (
    <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="h-3 bg-gray-100 rounded w-full" />
        <div className="h-3 bg-gray-100 rounded w-5/6" />
      </div>
    </div>
  );

  if (loading) {
    const count = skeletonCount ?? safeCardsPerPage;
    const skeletonItems = Array.from({ length: count });

    return (
      <div className={wrapperClassName}>
        <div className={gridClasses} style={gridStyle}>
          {skeletonItems.map((_, index) => (
            <React.Fragment key={index}>
              {renderSkeleton ? renderSkeleton(index) : defaultSkeleton()}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (!processedData.length) {
    return renderEmpty ? (
      renderEmpty()
    ) : (
      <div className={emptyClassName}>{emptyMessage}</div>
    );
  }

  const renderGrouped = () => {
    const groups = {};

    paginatedData.forEach((item) => {
      const key = groupBy(item) || "Others";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return Object.entries(groups).map(([groupKey, items]) => (
      <div key={groupKey} className="space-y-3">
        {renderGroupHeader ? (
          renderGroupHeader(groupKey, items)
        ) : (
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider py-2 border-b border-gray-100">
            {groupKey}
          </div>
        )}

        <div className={gridClasses} style={gridStyle}>
          {items.map((item, index) => (
            <React.Fragment key={getKey ? getKey(item, index) : index}>
              {renderCard(item, index, layoutMode)}
            </React.Fragment>
          ))}
        </div>
      </div>
    ));
  };

  const renderList = () => (
    <div className={`flex flex-col ${gapClassName} ${gridClassName}`}>
      {paginatedData.map((item, index) => (
        <div
          key={getKey ? getKey(item, index) : index}
          style={{ height: listItemHeight }}
        >
          {renderCard(item, index, layoutMode)}
        </div>
      ))}
    </div>
  );

  const renderMasonry = () => (
    <div style={gridStyle} className={gridClassName}>
      {paginatedData.map((item, index) => (
        <div
          key={getKey ? getKey(item, index) : index}
          style={{ breakInside: "avoid", marginBottom: "1rem" }}
        >
          {renderCard(item, index, layoutMode)}
        </div>
      ))}
    </div>
  );

  const renderGrid = () => (
    <div className={gridClasses} style={gridStyle}>
      {paginatedData.map((item, index) => (
        <React.Fragment key={getKey ? getKey(item, index) : index}>
          {renderCard(item, index, layoutMode)}
        </React.Fragment>
      ))}
    </div>
  );

  const paginationProps = {
    currentPage,
    totalPages,
    onPrevious: () => setCurrentPage((page) => Math.max(page - 1, 1)),
    onNext: () => setCurrentPage((page) => Math.min(page + 1, totalPages)),
  };

  const contextInfo = {
    currentPage,
    totalPages,
    totalItems: processedData.length,
    visibleItems: paginatedData.length,
  };

  return (
    <div className={wrapperClassName}>
      {renderHeader && renderHeader(contextInfo)}

      {groupBy
        ? renderGrouped()
        : layoutMode === "list"
        ? renderList()
        : layoutMode === "masonry"
        ? renderMasonry()
        : renderGrid()}

      {showPagination && totalPages > 1 && (
        <div className={paginationWrapperClassName}>
          {CustomPagination ? (
            <CustomPagination {...paginationProps} />
          ) : (
            <Pagination {...paginationProps} />
          )}
        </div>
      )}

      {renderFooter && renderFooter(contextInfo)}
    </div>
  );
};

export default DynamicCardGrid;