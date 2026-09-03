import * as React from "react"
import { useForm } from "@inertiajs/react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TagInput } from "@/components/ui/tag-input"
import type { Bookmark } from "@/types/bookmarks"

type Props = {
  open: boolean
  onClose: () => void
  /** null = create mode, a bookmark = edit mode. */
  bookmark: Bookmark | null
  suggestions: string[]
}

const looksLikeUrl = (value: string) => /^https?:\/\/\S+\.\S+/i.test(value.trim())

export function BookmarkFormDialog({ open, onClose, bookmark, suggestions }: Props) {
  const isEdit = bookmark !== null

  const form = useForm({
    url: "",
    title: "",
    notes: "",
    tag_names: [] as string[],
  })
  const { data, setData, processing, errors, clearErrors } = form

  const [fetchingTitle, setFetchingTitle] = React.useState(false)
  // Escape should close the tag suggestions first, not discard the whole form.
  const [tagListboxOpen, setTagListboxOpen] = React.useState(false)
  // Only auto-fill a title the user hasn't touched, so a fetch can never
  // overwrite something they typed.
  const titleTouched = React.useRef(false)
  const abortRef = React.useRef<AbortController | null>(null)

  // Reset the form whenever the dialog opens, so create mode starts blank and
  // edit mode starts pre-filled.
  //
  // setData rather than setDefaults + reset: useForm's reset() closes over the
  // `defaults` state from the current render, so a setDefaults() in the same
  // tick hasn't landed yet and reset() would apply the *previous* bookmark's
  // values — leaving the first open of the edit dialog completely blank.
  React.useEffect(() => {
    if (!open) return
    form.setData({
      url: bookmark?.url ?? "",
      title: bookmark?.title ?? "",
      notes: bookmark?.notes ?? "",
      tag_names: bookmark?.tags.map((tag) => tag.name) ?? [],
    })
    form.clearErrors()
    titleTouched.current = Boolean(bookmark?.title)
    setFetchingTitle(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bookmark?.id])

  React.useEffect(() => () => abortRef.current?.abort(), [])

  const fetchTitle = async (url: string) => {
    if (titleTouched.current || !looksLikeUrl(url)) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setFetchingTitle(true)

    try {
      const response = await fetch(
        `/bookmarks/title_preview?url=${encodeURIComponent(url.trim())}`,
        { signal: controller.signal, headers: { Accept: "application/json" } },
      )
      const body = (await response.json()) as { title: string | null }
      // Falls back to manual entry: a null title just leaves the field empty.
      if (body.title && !titleTouched.current) setData("title", body.title)
    } catch {
      // Network failure or abort — the user types the title instead.
    } finally {
      if (!controller.signal.aborted) setFetchingTitle(false)
    }
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const options = { preserveScroll: true, preserveState: true, onSuccess: onClose }
    if (isEdit) {
      form.patch(`/bookmarks/${bookmark.id}`, options)
    } else {
      form.post("/bookmarks", options)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        size="lg"
        onEscapeKeyDown={(event) => {
          if (tagListboxOpen) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit bookmark" : "New bookmark"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the link, notes, or tags for this bookmark."
              : "Paste a link and we'll try to fill in the title for you."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="bookmark-url">URL</label>
            <Input
              id="bookmark-url"
              type="url"
              inputMode="url"
              required
              autoFocus
              placeholder="https://example.com/article"
              aria-invalid={!!errors.url}
              aria-describedby={errors.url ? "bookmark-url-error" : undefined}
              value={data.url}
              onChange={(event) => {
                // Drop the stale server error as soon as the user starts
                // fixing the field.
                if (errors.url) clearErrors("url")
                setData("url", event.target.value)
              }}
              onBlur={(event) => fetchTitle(event.target.value)}
            />
            {errors.url && (
              <p id="bookmark-url-error" className="text-xs text-danger-display">
                {errors.url}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="bookmark-title">Title</label>
            <div className="relative">
              <Input
                id="bookmark-title"
                placeholder="Fetched automatically — or type your own"
                aria-invalid={!!errors.title}
                value={data.title}
                onChange={(event) => {
                  if (errors.title) clearErrors("title")
                  titleTouched.current = true
                  setData("title", event.target.value)
                }}
              />
              {fetchingTitle && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-ink-muted" />
              )}
            </div>
            <p className="text-xs text-ink-muted" aria-live="polite">
              {fetchingTitle ? "Fetching the page title…" : "Leave blank to use the URL."}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="bookmark-notes">Notes</label>
            <textarea
              id="bookmark-notes"
              className="form-control form-control-textarea"
              placeholder="Why you saved this…"
              value={data.notes}
              onChange={(event) => setData("notes", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="bookmark-tags">Tags</label>
            <TagInput
              id="bookmark-tags"
              value={data.tag_names}
              onChange={(tags) => setData("tag_names", tags)}
              suggestions={suggestions}
              onListboxOpenChange={setTagListboxOpen}
            />
            <p className="text-xs text-ink-muted">
              Pick an existing tag or type a new one — new tags are created as you save.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              {isEdit ? "Save changes" : "Save bookmark"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
