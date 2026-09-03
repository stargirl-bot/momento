// bm-design-system: pagination primitive
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const WINDOW = 1; // pages shown either side of the current one

/**
 * Builds the page list with gaps collapsed to ellipses, always keeping the
 * first, last, and current pages plus WINDOW neighbours:
 *   1 … 4 [5] 6 … 20
 */
export function pageItems(currentPage: number, totalPages: number): (number | "gap")[] {
  const pages = new Set<number>([1, totalPages]);
  for (let page = currentPage - WINDOW; page <= currentPage + WINDOW; page++) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items: (number | "gap")[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push("gap");
    items.push(page);
  });
  return items;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  /** Router-agnostic: return the href for a given page number. */
  buildHref: (page: number) => string;
  /** Rendered as the link element, so this stays framework-agnostic. */
  linkComponent?: React.ElementType;
  className?: string;
  label?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  buildHref,
  linkComponent: Link = "a",
  className,
  label = "Pagination",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const stepClass =
    "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border border-hairline px-2 text-sm no-underline";

  return (
    <nav aria-label={label} className={cn("flex items-center justify-center gap-1", className)}>
      {currentPage > 1 ? (
        <Link
          href={buildHref(currentPage - 1)}
          aria-label="Previous page"
          className={cn(stepClass, "text-ink-body hover:bg-surface")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-hidden className={cn(stepClass, "text-ink-muted opacity-50")}>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}

      {pageItems(currentPage, totalPages).map((item, index) =>
        item === "gap" ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="inline-flex h-8 min-w-8 items-center justify-center text-sm text-ink-muted"
          >
            &hellip;
          </span>
        ) : item === currentPage ? (
          <span
            key={item}
            aria-current="page"
            className={cn(stepClass, "border-accent bg-accent-faded font-medium text-accent-display")}
          >
            {item}
          </span>
        ) : (
          <Link
            key={item}
            href={buildHref(item)}
            aria-label={`Page ${item}`}
            className={cn(stepClass, "text-ink-body hover:bg-surface")}
          >
            {item}
          </Link>
        ),
      )}

      {currentPage < totalPages ? (
        <Link
          href={buildHref(currentPage + 1)}
          aria-label="Next page"
          className={cn(stepClass, "text-ink-body hover:bg-surface")}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span aria-hidden className={cn(stepClass, "text-ink-muted opacity-50")}>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
