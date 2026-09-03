import { Link } from "@inertiajs/react"
import { Settings2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { TagDot } from "@/components/ui/tag-pill"
import type { TagWithCount } from "@/types/bookmarks"
import { bookmarksPath, toggleTag } from "./bookmarkParams"

type Props = {
  tags: TagWithCount[]
  activeTags: string[]
  totalCount: number
  query: string
}

/**
 * Counts are each tag's total across the whole collection, not the currently
 * filtered subset. With AND filtering, filtered counts collapse to zero for
 * almost every unselected tag the moment one is active, which makes the list
 * useless for navigating onwards.
 */
export function TagFilterSidebar({ tags, activeTags, totalCount, query }: Props) {
  const href = (tagNames: string[]) => bookmarksPath({ q: query, tags: tagNames })

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden lg:block">
        <h6 className="mb-3">Tags</h6>
        <nav className="flex flex-col gap-0.5">
          <Link
            href={href([])}
            preserveScroll
            aria-current={activeTags.length === 0 ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm no-underline",
              activeTags.length === 0
                ? "bg-accent-faded text-accent-display"
                : "text-ink-body hover:bg-surface hover:text-ink-display",
            )}
          >
            <span className="flex-1 truncate">All bookmarks</span>
            <span className="text-xs text-ink-muted">{totalCount}</span>
          </Link>

          {tags.map((tag) => {
            const active = activeTags.includes(tag.name)
            return (
              <Link
                key={tag.id}
                href={href(toggleTag(activeTags, tag.name))}
                preserveScroll
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm no-underline",
                  active
                    ? "bg-accent-faded text-accent-display"
                    : "text-ink-body hover:bg-surface hover:text-ink-display",
                )}
              >
                <TagDot color={tag.color} />
                <span className="flex-1 truncate">{tag.name}</span>
                <span className="text-xs text-ink-muted">{tag.bookmarks_count}</span>
              </Link>
            )
          })}
        </nav>

        {tags.length === 0 && (
          <p className="px-2 text-xs text-ink-muted">
            Tags you add to a bookmark will show up here.
          </p>
        )}

        <div className="mt-4 border-t border-hairline pt-3">
          <Link
            href="/tags"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-muted no-underline hover:bg-surface hover:text-ink-display"
          >
            <Settings2 className="h-3.5 w-3.5" /> Manage tags
          </Link>
        </div>
      </aside>

      {/* Mobile chip row — same data, horizontally scrollable */}
      {tags.length > 0 && (
        <div className="-mx-6 overflow-x-auto px-6 lg:hidden">
          <div className="flex w-max items-center gap-2 pb-1">
            <Link
              href={href([])}
              preserveScroll
              className="toggle-button no-underline"
              aria-pressed={activeTags.length === 0}
            >
              All <span className="text-ink-muted">{totalCount}</span>
            </Link>
            {tags.map((tag) => (
              <Link
                key={tag.id}
                href={href(toggleTag(activeTags, tag.name))}
                preserveScroll
                className="toggle-button no-underline"
                aria-pressed={activeTags.includes(tag.name)}
              >
                <TagDot color={tag.color} />
                {tag.name} <span className="text-ink-muted">{tag.bookmarks_count}</span>
              </Link>
            ))}
            <Link href="/tags" className="toggle-button no-underline">
              <Settings2 className="h-3.5 w-3.5" /> Manage
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
