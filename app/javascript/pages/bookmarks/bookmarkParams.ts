import type { BookmarkFilters } from "@/types/bookmarks"

/**
 * The query-param contract for the bookmarks list:
 *   /bookmarks?q=react&tags=design,ai&page=2
 *
 * Tag *names* rather than ids keep the URL readable and shareable, which is the
 * point of putting filter state there. Tag names are validated server-side to
 * exclude commas so the delimiter is never ambiguous.
 */
export function bookmarksPath({
  q,
  tags,
  page,
}: Partial<BookmarkFilters> & { page?: number }): string {
  const params = new URLSearchParams()
  if (q) params.set("q", q)
  if (tags && tags.length) params.set("tags", tags.join(","))
  if (page && page > 1) params.set("page", String(page))

  const query = params.toString()
  return query ? `/bookmarks?${query}` : "/bookmarks"
}

/** Adds or removes a tag from the active filter set. */
export function toggleTag(tags: string[], name: string): string[] {
  return tags.includes(name) ? tags.filter((tag) => tag !== name) : [...tags, name]
}
