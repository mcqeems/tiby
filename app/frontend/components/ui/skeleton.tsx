"use client";

/**
 * Skeleton placeholders for data that is on its way.
 *
 * Both themes work without extra CSS: the tint is `bg-gray-200`, and `.dark`
 * already redefines `--color-gray-200`, so the placeholder follows the theme.
 * `motion-safe:animate-pulse` keeps the built-in pulse for everyone who has not
 * asked for reduced motion, and leaves a still tint for everyone who has.
 *
 * Compose from the primitives when a screen has a shape the presets do not
 * cover; every preset takes `className` plus its own count/rows/columns.
 */

/** The primitive: one pulsing block. */
export function Skeleton({
  className = "",
  circle = false,
}: {
  className?: string;
  /** Fully rounded, for avatars and dots. */
  circle?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`block bg-gray-200 motion-safe:animate-pulse ${
        circle ? "rounded-full" : "rounded-md"
      } ${className}`}
    />
  );
}

/**
 * Wraps a group of placeholders so a screen reader hears "memuat ..." once
 * instead of walking through decoration.
 */
export function SkeletonRegion({
  label,
  children,
  className = "",
}: {
  /** What is loading, e.g. "Memuat data faskes". */
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={`space-y-3 ${className}`}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Lines of text. Widths vary so it does not read as a barcode. */
export function SkeletonText({
  lines = 3,
  className = "",
  lineClassName = "",
}: {
  lines?: number;
  className?: string;
  lineClassName?: string;
}) {
  const widths = ["w-full", "w-[92%]", "w-[70%]", "w-[85%]", "w-[60%]"];
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${widths[i % widths.length]} ${lineClassName}`}
        />
      ))}
    </div>
  );
}

/**
 * List rows: optional leading avatar, a title line and a shorter subtitle.
 * Covers bell items, contacts, tickets, timeline entries.
 */
export function SkeletonRows({
  rows = 3,
  avatar = false,
  className = "",
  rowClassName = "",
}: {
  rows?: number;
  avatar?: boolean;
  className?: string;
  rowClassName?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex items-start gap-3 ${rowClassName}`}>
          {avatar && <Skeleton circle className="h-9 w-9 shrink-0" />}
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-[55%]" />
            <Skeleton className="h-3 w-[85%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A table: header strip plus `rows` x `columns` cells. */
export function SkeletonTable({
  rows = 6,
  columns = 5,
  className = "",
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xs ${className}`}
    >
      <div className="flex gap-4 border-b border-gray-100 bg-gray-50/70 px-5 py-3.5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-gray-100">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex items-center gap-4 px-5 py-4">
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton
                key={col}
                className={`flex-1 ${col === 0 ? "h-4" : "h-3.5"}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card grid, e.g. education material or a facility list. */
export function SkeletonCards({
  count = 3,
  lines = 3,
  className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
  cardClassName = "",
}: {
  count?: number;
  lines?: number;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs ${cardClassName}`}
        >
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-4 w-[70%]" />
          <SkeletonText lines={lines} />
        </div>
      ))}
    </div>
  );
}

/** Row of stat cards, e.g. the dashboard totals. */
export function SkeletonStats({
  count = 4,
  className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
  cardClassName = "",
}: {
  count?: number;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`space-y-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-2xs ${cardClassName}`}
        >
          <Skeleton className="h-9 w-9" circle />
          <Skeleton className="h-3 w-[60%]" />
          <Skeleton className="h-5 w-[40%]" />
        </div>
      ))}
    </div>
  );
}
