import * as React from "react"
import { Head, Link, usePage } from "@inertiajs/react"
import { BookmarkPlus, Search, X } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/ui/pagination"
import type { PageProps } from "@/types/inertia"
import type { Bookmark, BookmarksPageProps } from "@/types/bookmarks"
import { BookmarkCard } from "./BookmarkCard"
import { BookmarkFormDialog } from "./BookmarkFormDialog"
import { DeleteBookmarkDialog } from "./DeleteBookmarkDialog"
import { TagFilterSidebar } from "./TagFilterSidebar"
import { bookmarksPath } from "./bookmarkParams"
import { useLiveSearch } from "./useLiveSearch"

const DESCRIPTION =
  "Every link you've saved to Momento, searchable by text and filterable by tag."

export default function BookmarksIndex({
  bookmarks,
  tags,
  pagination,
  filters,
  total_bookmarks: totalBookmarks,
}: BookmarksPageProps) {
  const { props } = usePage<PageProps>()
  const [query, setQuery] = useLiveSearch(filters.q, filters.tags)

  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Bookmark | null>(null)
  const [deleting, setDeleting] = React.useState<Bookmark | null>(null)

  const suggestions = React.useMemo(() => tags.map((tag) => tag.name), [tags])
  const isFiltered = filters.q !== "" || filters.tags.length > 0

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (bookmark: Bookmark) => {
    setEditing(bookmark)
    setFormOpen(true)
  }

  return (
    <>
      <Head title="Bookmarks">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Bookmarks" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>

      <AppShell width="wide">
        <PageHeader
          title="Bookmarks"
          description={
            totalBookmarks === 1 ? "1 bookmark saved." : `${totalBookmarks} bookmarks saved.`
          }
          actions={
            <Button onClick={openCreate}>
              <BookmarkPlus className="h-4 w-4" /> New bookmark
            </Button>
          }
        />

        {props.flash?.notice && (
          <p className="mt-6 text-sm text-accent" role="status">
            {props.flash.notice}
          </p>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[13rem_1fr]">
          <TagFilterSidebar
            tags={tags}
            activeTags={filters.tags}
            totalCount={totalBookmarks}
            query={filters.q}
          />

          <div className="min-w-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-muted" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles, URLs, and notes…"
                aria-label="Search bookmarks"
                className="pl-9"
              />
            </div>

            {isFiltered && (
              <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
                <span>
                  {pagination.total_count} {pagination.total_count === 1 ? "match" : "matches"}
                  {filters.tags.length > 0 && ` tagged ${filters.tags.join(" + ")}`}
                </span>
                <Link href="/bookmarks" className="inline-flex items-center gap-1">
                  <X className="h-3 w-3" /> Clear filters
                </Link>
              </div>
            )}

            {bookmarks.length === 0 ? (
              <EmptyState isFiltered={isFiltered} onCreate={openCreate} />
            ) : (
              <div className="mt-4 space-y-3">
                {bookmarks.map((bookmark) => (
                  <BookmarkCard
                    key={bookmark.id}
                    bookmark={bookmark}
                    onEdit={openEdit}
                    onDelete={setDeleting}
                  />
                ))}
              </div>
            )}

            <Pagination
              className="mt-8"
              currentPage={pagination.current_page}
              totalPages={pagination.total_pages}
              buildHref={(page) => bookmarksPath({ q: filters.q, tags: filters.tags, page })}
              linkComponent={Link}
              label="Bookmark pages"
            />
          </div>
        </div>
      </AppShell>

      <BookmarkFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        bookmark={editing}
        suggestions={suggestions}
      />
      <DeleteBookmarkDialog bookmark={deleting} onClose={() => setDeleting(null)} />
    </>
  )
}

function EmptyState({
  isFiltered,
  onCreate,
}: {
  isFiltered: boolean
  onCreate: () => void
}) {
  return (
    <div className="callout mt-4 text-center">
      {isFiltered ? (
        <>
          <h3>No bookmarks match these filters</h3>
          <p className="mt-2">Try a different search term, or clear the filters to start over.</p>
          <div className="mt-4">
            <Button asChild variant="secondary">
              <Link href="/bookmarks">Clear filters</Link>
            </Button>
          </div>
        </>
      ) : (
        <>
          <h3>Nothing saved yet</h3>
          <p className="mt-2">
            Paste a link and Momento will fetch its title. Tag it to find it again later.
          </p>
          <div className="mt-4">
            <Button onClick={onCreate}>
              <BookmarkPlus className="h-4 w-4" /> Save your first bookmark
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
