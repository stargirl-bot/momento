import * as React from "react";
import { SectionShell } from "@/components/design-system/SectionShell";
import { Pagination } from "@/components/ui/pagination";

const code = `import { Pagination } from "@/components/ui/pagination";
import { Link } from "@inertiajs/react";

<Pagination
  currentPage={pagination.current_page}
  totalPages={pagination.total_pages}
  buildHref={(page) => \`/bookmarks?page=\${page}\`}
  linkComponent={Link}
/>`;

export function PaginationSection() {
  const [page, setPage] = React.useState(5);

  return (
    <SectionShell
      id="pagination"
      title="Pagination"
      description={
        <>
          Numbered page navigation for server-paginated lists. First, last, and
          current pages are always shown with one neighbour either side; the
          rest collapse to an ellipsis. Renders nothing at all when there is
          only one page.
        </>
      }
      whenToUse={
        <ul>
          <li>Server-paginated lists where the page belongs in the URL and stays shareable.</li>
          <li>When a reader benefits from knowing how much is left, or from jumping around.</li>
        </ul>
      }
      whenNotToUse={
        <ul>
          <li>Feeds meant to be scrolled continuously — prefer a "Load more" button.</li>
          <li>Lists short enough to render in one page.</li>
        </ul>
      }
      preview={
        <div className="space-y-4">
          <Pagination
            currentPage={page}
            totalPages={20}
            buildHref={(target) => `#page-${target}`}
            linkComponent={({ href, ...props }: React.ComponentProps<"a">) => (
              <a
                href={href}
                {...props}
                onClick={(event) => {
                  event.preventDefault();
                  setPage(Number(String(href).replace("#page-", "")));
                }}
              />
            )}
          />
          <p className="text-center text-xs text-ink-muted">Page {page} of 20</p>
        </div>
      }
      code={code}
      options={
        <ul className="list-disc pl-5">
          <li>
            <code>currentPage</code>, <code>totalPages</code>: 1-based, from the server.
          </li>
          <li>
            <code>buildHref(page)</code>: keeps the component router-agnostic — build the href with
            the current filters so query state survives paging.
          </li>
          <li>
            <code>linkComponent</code>: pass Inertia's <code>Link</code> for client-side navigation;
            defaults to a plain <code>&lt;a&gt;</code>.
          </li>
          <li>
            <code>label</code> sets the <code>nav</code>'s accessible name when a page has more than
            one paginator.
          </li>
        </ul>
      }
    />
  );
}
