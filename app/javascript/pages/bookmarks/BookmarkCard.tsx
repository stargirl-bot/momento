import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { TagPill } from "@/components/ui/tag-pill"
import type { Bookmark } from "@/types/bookmarks"

export function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
}: {
  bookmark: Bookmark
  onEdit: (bookmark: Bookmark) => void
  onDelete: (bookmark: Bookmark) => void
}) {
  return (
    <article className="callout bg-page">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate">
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
              {bookmark.title || bookmark.url}
            </a>
          </h3>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex max-w-full items-center gap-1 text-xs text-ink-muted hover:text-ink-body"
          >
            <span className="truncate">{bookmark.host ?? bookmark.url}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Actions for ${bookmark.title || bookmark.url}`}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(bookmark)}>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(bookmark)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {bookmark.notes && <p className="mt-3 whitespace-pre-line text-sm">{bookmark.notes}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {bookmark.tags.map((tag) => (
          <TagPill key={tag.id} color={tag.color}>
            {tag.name}
          </TagPill>
        ))}
        <span className="ml-auto text-xs text-ink-muted">
          Saved <time dateTime={bookmark.created_at}>{bookmark.created_at_label}</time>
        </span>
      </div>
    </article>
  )
}
