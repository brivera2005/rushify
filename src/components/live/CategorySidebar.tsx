"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FixedSizeList, type ListChildComponentProps } from "react-window";

import { cn } from "@/lib/utils/cn";

const ROW_HEIGHT = 64;
const VIRTUALIZE_THRESHOLD = 100;

export type CategorySidebarProps = {
  groupNames: string[];
  groupCounts: Map<string, number>;
  totalChannelCount: number;
  favoriteCount: number;
  activeCategory: string | null;
  favoritesOnly: boolean;
  hiddenCategories: Set<string>;
  showHidden: boolean;
  onSelectAll: () => void;
  onSelectFavorites: () => void;
  onSelectCategory: (category: string) => void;
  onHideCategory: (category: string) => void;
  onShowCategory: (category: string) => void;
  onToggleShowHidden: () => void;
  isSaving?: boolean;
  className?: string;
};

type CategoryRow = {
  name: string;
  count: number;
  isHidden: boolean;
};

type VirtualRowData = {
  rows: CategoryRow[];
  activeCategory: string | null;
  favoritesOnly: boolean;
  showHidden: boolean;
  onSelectCategory: (category: string) => void;
  onHideCategory: (category: string) => void;
  onShowCategory: (category: string) => void;
};

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-auto shrink-0 rounded-md bg-rush-canvas/80 px-1.5 py-0.5 text-xs tabular-nums text-rush-muted">
      {count}
    </span>
  );
}

function CategoryRowItem({ index, style, data }: ListChildComponentProps<VirtualRowData>) {
  const row = data.rows[index];
  if (!row) return null;

  const isActive = !data.favoritesOnly && data.activeCategory === row.name;

  return (
    <div style={style} className="px-1.5">
      <div
        className={cn(
          "group flex items-start gap-1 rounded-lg pr-1 transition-colors",
          isActive ? "bg-rush-accent/20" : "hover:bg-rush-surface",
          row.isHidden && data.showHidden && "opacity-60",
        )}
      >
        <button
          type="button"
          onClick={() => data.onSelectCategory(row.name)}
          className={cn(
            "flex min-w-0 flex-1 items-start gap-2 px-3 py-2 text-left",
            isActive ? "font-medium text-rush-foreground" : "text-rush-muted hover:text-rush-foreground",
          )}
        >
          <span className="line-clamp-3 flex-1 text-base leading-snug">{row.name}</span>
          <CountBadge count={row.count} />
        </button>
        <button
          type="button"
          aria-label={row.isHidden ? `Show ${row.name}` : `Hide ${row.name}`}
          onClick={(event) => {
            event.stopPropagation();
            if (row.isHidden) {
              data.onShowCategory(row.name);
            } else {
              data.onHideCategory(row.name);
            }
          }}
          className="mt-2 shrink-0 rounded px-1.5 py-1 text-xs text-rush-muted opacity-0 transition-opacity hover:text-rush-foreground group-hover:opacity-100"
        >
          {row.isHidden ? "👁" : "✕"}
        </button>
      </div>
    </div>
  );
}

function CategoryList({
  rows,
  activeCategory,
  favoritesOnly,
  showHidden,
  onSelectCategory,
  onHideCategory,
  onShowCategory,
  maxHeight,
}: {
  rows: CategoryRow[];
  activeCategory: string | null;
  favoritesOnly: boolean;
  showHidden: boolean;
  onSelectCategory: (category: string) => void;
  onHideCategory: (category: string) => void;
  onShowCategory: (category: string) => void;
  maxHeight: number;
}) {
  const itemData = useMemo<VirtualRowData>(
    () => ({
      rows,
      activeCategory,
      favoritesOnly,
      showHidden,
      onSelectCategory,
      onHideCategory,
      onShowCategory,
    }),
    [rows, activeCategory, favoritesOnly, showHidden, onSelectCategory, onHideCategory, onShowCategory],
  );

  if (rows.length === 0) {
    return <p className="px-3 py-3 text-sm text-rush-muted">No categories</p>;
  }

  if (rows.length >= VIRTUALIZE_THRESHOLD) {
    const listHeight = Math.min(maxHeight, rows.length * ROW_HEIGHT);
    return (
      <FixedSizeList
        height={listHeight}
        width="100%"
        itemCount={rows.length}
        itemSize={ROW_HEIGHT}
        itemData={itemData}
        overscanCount={12}
      >
        {CategoryRowItem}
      </FixedSizeList>
    );
  }

  return (
    <div className="space-y-0.5">
      {rows.map((row, index) => (
        <CategoryRowItem key={row.name} index={index} style={{ height: ROW_HEIGHT }} data={itemData} />
      ))}
    </div>
  );
}

function SidebarPanel({
  groupNames,
  groupCounts,
  totalChannelCount,
  favoriteCount,
  activeCategory,
  favoritesOnly,
  hiddenCategories,
  showHidden,
  onSelectAll,
  onSelectFavorites,
  onSelectCategory,
  onHideCategory,
  onShowCategory,
  onToggleShowHidden,
  onClose,
  isSaving,
  className,
}: CategorySidebarProps & { onClose?: () => void }) {
  const visibleCount = useMemo(
    () => groupNames.filter((name) => !hiddenCategories.has(name) || showHidden).length,
    [groupNames, hiddenCategories, showHidden],
  );

  const categoryRows = useMemo<CategoryRow[]>(() => {
    return groupNames
      .filter((name) => showHidden || !hiddenCategories.has(name))
      .map((name) => ({
        name,
        count: groupCounts.get(name) ?? 0,
        isHidden: hiddenCategories.has(name),
      }));
  }, [groupNames, groupCounts, hiddenCategories, showHidden]);

  const visibleChannelCount = useMemo(() => {
    if (showHidden) return totalChannelCount;
    let hidden = 0;
    for (const name of hiddenCategories) {
      hidden += groupCounts.get(name) ?? 0;
    }
    return totalChannelCount - hidden;
  }, [showHidden, totalChannelCount, hiddenCategories, groupCounts]);

  const allActive = !favoritesOnly && activeCategory === null;
  const listRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(480);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setListHeight(Math.max(120, entry?.contentRect.height ?? 480));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <aside
      className={cn(
        "flex w-full min-w-0 shrink-0 flex-col rounded-xl border border-rush-border bg-rush-surface/40",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-rush-border px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wider text-rush-muted">Categories</p>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-rush-canvas/80 px-2 py-0.5 text-xs tabular-nums text-rush-muted">
            {visibleCount}
          </span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded px-1.5 py-0.5 text-xs text-rush-muted hover:text-rush-foreground"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-0.5 border-b border-rush-border p-1.5">
        <button
          type="button"
          onClick={onSelectAll}
          className={cn(
            "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-base transition-colors",
            allActive
              ? "bg-rush-accent/20 font-medium text-rush-foreground"
              : "text-rush-muted hover:bg-rush-surface hover:text-rush-foreground",
          )}
        >
          <span className="flex-1">All</span>
          <CountBadge count={visibleChannelCount} />
        </button>
        <button
          type="button"
          onClick={onSelectFavorites}
          className={cn(
            "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-base transition-colors",
            favoritesOnly
              ? "bg-rush-accent/20 font-medium text-rush-foreground"
              : "text-rush-muted hover:bg-rush-surface hover:text-rush-foreground",
          )}
        >
          <span className="flex-1">★ Favorites</span>
          <CountBadge count={favoriteCount} />
        </button>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-hidden p-1.5">
        <CategoryList
          rows={categoryRows}
          activeCategory={activeCategory}
          favoritesOnly={favoritesOnly}
          showHidden={showHidden}
          onSelectCategory={onSelectCategory}
          onHideCategory={onHideCategory}
          onShowCategory={onShowCategory}
          maxHeight={listHeight}
        />
      </div>

      {hiddenCategories.size > 0 && (
        <div className="border-t border-rush-border p-2.5">
          <button
            type="button"
            onClick={onToggleShowHidden}
            className={cn(
              "w-full rounded-lg px-3 py-2 text-left text-xs transition-colors",
              showHidden
                ? "bg-rush-accent/15 text-rush-accent"
                : "text-rush-muted hover:bg-rush-surface hover:text-rush-foreground",
            )}
          >
            {showHidden ? "Hide hidden categories" : `Show hidden (${hiddenCategories.size})`}
          </button>
        </div>
      )}

      <p className="border-t border-rush-border px-4 py-2 text-[11px] text-rush-muted">
        {visibleCount} categor{visibleCount === 1 ? "y" : "ies"} · {visibleChannelCount} channels
        {isSaving ? " · Saving…" : null}
      </p>
    </aside>
  );
}

export function CategorySidebar(props: CategorySidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const handleSelectAll = useCallback(() => {
    props.onSelectAll();
    closeMobile();
  }, [props, closeMobile]);

  const handleSelectFavorites = useCallback(() => {
    props.onSelectFavorites();
    closeMobile();
  }, [props, closeMobile]);

  const handleSelectCategory = useCallback(
    (category: string) => {
      props.onSelectCategory(category);
      closeMobile();
    },
    [props, closeMobile],
  );

  const activeLabel = props.favoritesOnly
    ? "Favorites"
    : props.activeCategory ?? "All";

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex w-full items-center justify-between rounded-xl border border-rush-border bg-rush-surface/80 px-3 py-2 text-sm"
        >
          <span className="text-rush-muted">Category</span>
          <span className="font-medium">{activeLabel}</span>
        </button>
      </div>

      <div className="hidden h-full min-h-0 lg:block">
        <SidebarPanel {...props} className={cn("h-full", props.className)} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close categories"
            className="absolute inset-0 bg-black/60"
            onClick={closeMobile}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[75vh] overflow-hidden rounded-t-2xl border border-rush-border bg-rush-elevated shadow-2xl">
            <SidebarPanel
              {...props}
              onSelectAll={handleSelectAll}
              onSelectFavorites={handleSelectFavorites}
              onSelectCategory={handleSelectCategory}
              onClose={closeMobile}
              className="w-full rounded-none border-0 bg-transparent"
            />
          </div>
        </div>
      )}
    </>
  );
}

export { CATEGORY_SIDEBAR_WIDTH_PX as SIDEBAR_WIDTH_PX } from "@/components/live/live-layout";
