import * as React from "react"
import { Head, Link, router, usePage } from "@inertiajs/react"
import { Check, Trash2 } from "lucide-react"
import { AppShell } from "@/components/AppShell"
import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TagDot } from "@/components/ui/tag-pill"
import { cn } from "@/lib/utils"
import type { PageProps } from "@/types/inertia"
import type { TagWithCount } from "@/types/bookmarks"

const DESCRIPTION =
  "Rename, recolour, or delete the tags you use to organize your bookmarks."

export default function TagsIndex({
  tags,
  colors,
}: {
  tags: TagWithCount[]
  colors: string[]
}) {
  const { props } = usePage<PageProps>()
  const errors = props.errors ?? {}
  const [deleting, setDeleting] = React.useState<TagWithCount | null>(null)

  return (
    <>
      <Head title="Tags">
        <meta name="description" content={DESCRIPTION} />
        <meta property="og:title" content="Tags" />
        <meta property="og:description" content={DESCRIPTION} />
      </Head>

      <AppShell>
        <PageHeader
          title="Tags"
          description="Renaming or deleting a tag applies everywhere it's used."
          actions={
            <Button asChild variant="secondary">
              <Link href="/bookmarks">Back to bookmarks</Link>
            </Button>
          }
        />

        {props.flash?.notice && (
          <p className="mt-6 text-sm text-accent" role="status">
            {props.flash.notice}
          </p>
        )}
        {errors.name && <p className="mt-6 text-sm text-danger-display">{errors.name}</p>}

        {tags.length === 0 ? (
          <div className="callout mt-6 text-center">
            <h3>No tags yet</h3>
            <p className="mt-2">
              Tags are created when you add them to a bookmark. Save something and tag it to get
              started.
            </p>
            <div className="mt-4">
              <Button asChild>
                <Link href="/bookmarks">Go to bookmarks</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-hairline overflow-hidden rounded-md border border-hairline">
            {tags.map((tag) => (
              <li key={tag.id} className="p-4">
                <TagRow tag={tag} colors={colors} onDelete={() => setDeleting(tag)} />
              </li>
            ))}
          </ul>
        )}
      </AppShell>

      <Dialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{deleting?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              {deleting?.bookmarks_count
                ? `This tag will be removed from ${deleting.bookmarks_count} ${
                    deleting.bookmarks_count === 1 ? "bookmark" : "bookmarks"
                  }. The bookmarks themselves are kept.`
                : "This tag isn't used by any bookmarks."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (!deleting) return
                router.delete(`/tags/${deleting.id}`, {
                  preserveScroll: true,
                  onFinish: () => setDeleting(null),
                })
              }}
            >
              Delete tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function TagRow({
  tag,
  colors,
  onDelete,
}: {
  tag: TagWithCount
  colors: string[]
  onDelete: () => void
}) {
  const [name, setName] = React.useState(tag.name)
  const dirty = name.trim() !== tag.name

  // Keep in step after a successful rename re-renders the list.
  React.useEffect(() => setName(tag.name), [tag.name])

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    if (!dirty) return
    router.patch(`/tags/${tag.id}`, { name: name.trim() }, { preserveScroll: true })
  }

  const recolor = (color: string) => {
    if (color === tag.color) return
    router.patch(`/tags/${tag.id}`, { color }, { preserveScroll: true })
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <form onSubmit={save} className="flex min-w-0 flex-1 items-center gap-2">
        <TagDot color={tag.color} className="h-2.5 w-2.5" />
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label={`Rename ${tag.name}`}
          className="max-w-56"
        />
        {dirty && (
          <Button type="submit" size="sm" variant="soft">
            <Check className="h-3.5 w-3.5" /> Save
          </Button>
        )}
      </form>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1" role="group" aria-label={`Colour for ${tag.name}`}>
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => recolor(color)}
              aria-label={`Use colour ${color}`}
              aria-pressed={color === tag.color}
              className={cn(
                "flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                color === tag.color ? "border-accent" : "border-transparent hover:border-hairline",
              )}
            >
              <TagDot color={color} className="h-3 w-3" />
            </button>
          ))}
        </div>

        <span className="w-20 text-right text-xs text-ink-muted">
          {tag.bookmarks_count} {tag.bookmarks_count === 1 ? "bookmark" : "bookmarks"}
        </span>

        <Button variant="ghost" size="icon" onClick={onDelete} aria-label={`Delete ${tag.name}`}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
