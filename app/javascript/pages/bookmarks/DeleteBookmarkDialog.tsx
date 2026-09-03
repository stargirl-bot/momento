import { router } from "@inertiajs/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Bookmark } from "@/types/bookmarks"

/**
 * An explicit confirm step. Deliberately a Dialog rather than window.confirm —
 * a native modal blocks the page's event loop, which breaks browser automation
 * and can't be styled or themed.
 */
export function DeleteBookmarkDialog({
  bookmark,
  onClose,
}: {
  bookmark: Bookmark | null
  onClose: () => void
}) {
  const destroy = () => {
    if (!bookmark) return
    router.delete(`/bookmarks/${bookmark.id}`, {
      preserveScroll: true,
      onFinish: onClose,
    })
  }

  return (
    <Dialog open={bookmark !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Delete this bookmark?</DialogTitle>
          <DialogDescription>
            &ldquo;{bookmark?.title || bookmark?.url}&rdquo; will be removed. This can&rsquo;t be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={destroy}>
            Delete bookmark
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
