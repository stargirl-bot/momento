import type { TagColor } from "@/components/ui/tag-pill"

export type Tag = {
  id: number
  name: string
  color: TagColor | string
}

export type TagWithCount = Tag & {
  bookmarks_count: number
}

export type Bookmark = {
  id: number
  url: string
  title: string | null
  host: string | null
  notes: string | null
  ai_summary: string | null
  ai_status: "pending" | "done" | "failed"
  created_at: string
  created_at_label: string
  tags: Tag[]
}

export type PaginationMeta = {
  current_page: number
  total_pages: number
  total_count: number
  per_page: number
}

export type BookmarkFilters = {
  q: string
  tags: string[]
}

export type BookmarksPageProps = {
  bookmarks: Bookmark[]
  tags: TagWithCount[]
  pagination: PaginationMeta
  filters: BookmarkFilters
  total_bookmarks: number
}
