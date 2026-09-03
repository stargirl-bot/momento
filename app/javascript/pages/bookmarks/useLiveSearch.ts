import * as React from "react"
import { router } from "@inertiajs/react"
import { bookmarksPath } from "./bookmarkParams"

/**
 * Debounced live search.
 *
 * The input's text is local React state, so a response landing mid-typing can
 * never clobber what the user is entering. `preserveState` keeps that state
 * across the partial reload, `replace` avoids one history entry per keystroke,
 * and the page is always reset to 1 because a narrower result set may not have
 * the page the user was on.
 */
export function useLiveSearch(initialQuery: string, activeTags: string[]) {
  const [query, setQuery] = React.useState(initialQuery)
  const isFirstRun = React.useRef(true)

  // Keep in step when the server sends a different query (back/forward, or a
  // "clear filters" link).
  React.useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  React.useEffect(() => {
    // Don't fire on mount — the server already rendered this exact query.
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (query === initialQuery) return

    const timer = window.setTimeout(() => {
      router.get(
        bookmarksPath({ q: query, tags: activeTags }),
        {},
        {
          preserveState: true,
          preserveScroll: true,
          replace: true,
          only: ["bookmarks", "pagination", "filters"],
        },
      )
    }, 300)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  return [query, setQuery] as const
}
