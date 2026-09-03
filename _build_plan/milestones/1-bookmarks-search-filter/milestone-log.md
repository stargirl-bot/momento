# Milestone 1 — Bookmarks + Search & Filter

## What's new in the app

- **Bookmarks is now the home screen.** Logging in lands you on your bookmark library instead of the old placeholder "Home" page. The old Dashboard page is gone, and the sidebar now has **Bookmarks** and **Tags**.
- **Save a link in one step.** "+ New bookmark" opens a dialog. Paste a URL and the app fetches the page's title for you automatically — if it can't (dead link, blocked site), the field just stays empty and you type your own.
- **Notes and tags on every bookmark.** Add a personal note, and tag it with anything you like. Typing in the tag field autocompletes against tags you already use, and typing something new creates it on the spot — no separate setup step.
- **Bookmark cards** show the title (clickable, opens in a new tab), the site's domain, your notes, coloured tag pills, and the date you saved it.
- **Edit and delete.** Every card has a menu with Edit (re-opens the same dialog, pre-filled) and Delete (asks you to confirm first, naming the bookmark, so nothing goes by accident).
- **Live search.** Type in the search box and the list narrows as you go, matching against titles, URLs, *and* your notes. Your cursor never jumps and nothing you type gets overwritten.
- **Tag filtering with counts.** A sidebar lists every tag with how many bookmarks carry it. Click one to filter; click a second to narrow further — you get bookmarks that have **both** tags, not either.
- **Shareable filtered views.** Your search text, tag filters, and page number all live in the address bar, so you can bookmark or send a link to any filtered view and it opens exactly as you left it. Filters also survive adding, editing, and deleting.
- **Pagination.** 20 bookmarks a page, with numbered navigation. Deleting the last item on a page quietly moves you to a valid page instead of showing an empty screen.
- **A Tags management page.** Rename a tag (it updates everywhere at once), change its colour from eight preset options, or delete it. Deleting a tag tells you how many bookmarks it will come off, and keeps those bookmarks.
- **Helpful empty states.** A first-time user gets "Nothing saved yet" with a button to save their first link; a search with no matches gets "No bookmarks match these filters" with a "Clear filters" link.
- **Works on mobile and in dark mode.** The tag sidebar becomes a swipeable row of chips on narrow screens, and all eight tag colours stay readable in both light and dark themes.

---

## What was built

### Database (3 migrations)

| Migration | Table |
| --- | --- |
| `db/migrate/20260423000006_create_tags.rb` | `tags` — `user_id`, `name`, `color`, timestamps; unique index on `[user_id, name]` |
| `db/migrate/20260423000007_create_bookmarks.rb` | `bookmarks` — `user_id`, `url`, `title`, `notes`, `ai_summary`, `ai_status` (default `"pending"`), timestamps; index on `[user_id, created_at]` |
| `db/migrate/20260423000008_create_bookmark_tags.rb` | `bookmark_tags` — `bookmark_id`, `tag_id`, timestamps; unique index on `[bookmark_id, tag_id]` |

### Models

- **`app/models/bookmark.rb`** — `belongs_to :user`, `has_many :tags, through: :bookmark_tags`. `enum :ai_status` (`pending`/`done`/`failed`, `validate: true`). Normalizes `url` (strip) and `title` (squish). Validates URL presence, length, and `http`/`https`-only scheme. `#host` extracts the domain.
  - `Bookmark.search(query)` — case-insensitive `ILIKE` across title/url/notes.
  - `Bookmark.tagged_with_all(tag_ids)` — AND-semantics tag filter.
  - `scope :newest_first` — `created_at DESC, id DESC`.
- **`app/models/tag.rb`** — `COLORS` = `tag-1`…`tag-8`. Normalizes name to squished lowercase. Validates presence, ≤40 chars, per-user uniqueness, and no commas. `before_validation :assign_color, on: :create` picks a slot via `Tag.color_for(name)` (`Zlib.crc32(name) % 8`). `scope :alphabetical`.
- **`app/models/bookmark_tag.rb`** — plain join.
- **`app/models/user.rb`** — added `has_many :bookmarks` and `has_many :tags`, both `dependent: :destroy`.

### Service

- **`app/services/page_title_fetcher.rb`** (new `app/services/` directory) — `PageTitleFetcher.call(url) → String | nil`. Fetches a page with stdlib `Net::HTTP` and extracts its title. `PageTitleFetcher.extract_title(html)` is a pure function (prefers `<title>`, falls back to `meta[property="og:title"]`, squishes, truncates to 255). Every failure returns `nil`.

### Routes

```ruby
get "bookmarks/title_preview", to: "bookmarks#title_preview", as: :bookmark_title_preview
resources :bookmarks, only: %i[ index create update destroy ]
resources :tags,      only: %i[ index update destroy ]
get "dashboard", to: redirect("/bookmarks", status: 302), as: :dashboard
```

### Controllers

- **`app/controllers/bookmarks_controller.rb`** — `index` (filters/search/pagination/tag counts), `create`, `update`, `destroy`, and `title_preview` (the one `render json:` endpoint, hit by raw `fetch()`). `PER_PAGE = 20`. All mutations `redirect_back fallback_location: bookmarks_path`.
- **`app/controllers/tags_controller.rb`** — `index`, `update` (rename + recolour), `destroy`.
- **Deleted** `app/controllers/dashboard_controller.rb`.
- **Edited** `pages_controller.rb`, `concerns/authentication.rb` (`after_authentication_url`), `registrations_controller.rb` — all now point at `bookmarks_path`/`bookmarks_url`.

### Design-system additions

Each has a section on `/admin/design-system`, registered in **both** `DesignSystem.tsx` and `SidebarNav.tsx`:

| File | What |
| --- | --- |
| `app/frontend/components/ui/tag-pill.tsx` | `TagPill`, `TagDot`, `TAG_COLORS`, `TagColor` type |
| `app/frontend/components/ui/tag-input.tsx` | `TagInput` — multi-value combobox with autocomplete |
| `app/frontend/components/ui/pagination.tsx` | `Pagination`, `pageItems` — windowed numbered paginator |
| `.../sections/elements/TagPillsSection.tsx` | docs + preview |
| `.../sections/elements/TagInputSection.tsx` | docs + interactive preview |
| `.../sections/elements/PaginationSection.tsx` | docs + interactive preview |

- **`app/frontend/styles/design-system.css`** — added `--color-tag-1` … `--color-tag-8` to `@theme` with `.dark` overrides (lifted lightness), plus `.tag-dot` and `.tag-dot-tag-{1..8}` in `@layer components`.
- **`app/frontend/components/AppShell.tsx`** — new optional `width?: "default" | "wide"` prop (`max-w-4xl` / `max-w-6xl`). Default is byte-identical to before, so every existing caller is unaffected.
- **`app/frontend/components/MainNav.tsx`** — `DEFAULT_NAV_ITEMS` is now Bookmarks + Tags, `brandHref` → `/bookmarks`, `BRAND` → `"Momento"`.

### Pages and feature components

- **`app/frontend/types/bookmarks.ts`** — `Tag`, `TagWithCount`, `Bookmark`, `PaginationMeta`, `BookmarkFilters`, `BookmarksPageProps`.
- **`app/javascript/pages/bookmarks/`** — `Index.tsx`, `BookmarkCard.tsx`, `BookmarkFormDialog.tsx`, `DeleteBookmarkDialog.tsx`, `TagFilterSidebar.tsx`, `useLiveSearch.ts`, `bookmarkParams.ts`.
- **`app/javascript/pages/tags/Index.tsx`** — tag management (inline rename, colour swatches, delete dialog).
- **Deleted** `app/javascript/pages/Dashboard.tsx`.

### Tests (95 runs, 276 assertions, all green)

- `test/models/bookmark_test.rb`, `test/models/tag_test.rb`
- `test/controllers/bookmarks_controller_test.rb`, `test/controllers/tags_controller_test.rb`
- `test/services/page_title_fetcher_test.rb`
- `test/fixtures/{tags,bookmarks,bookmark_tags}.yml`
- `test/test_helper.rb` — added a shared `log_in_as(user, password: "password")` for `ActionDispatch::IntegrationTest`
- Updated the 7 `dashboard_path` assertions in `sessions_controller_test.rb` and `registrations_controller_test.rb`

### Other

- `public/robots.txt` — added `Disallow: /bookmarks` and `Disallow: /tags`. Nothing added to `config/sitemap.rb` or `public/llms.txt` (both routes are auth-gated).
- `Gemfile` — added `nokogiri` (was an undeclared transitive dep) and pinned `minitest "~> 5.25"` (see deviations).

---

## Decisions made during implementation (not pre-specified in the PRD)

1. **New/Edit form is a modal dialog** on the list page, one component in two modes, rather than separate `/bookmarks/new` and `/edit` pages. Keeps search/tag/page state on screen.
2. **Numbered pagination**, 20 per page, via `?page=`. Chosen over infinite scroll so the page number stays in the shareable URL.
3. **Tag filter is an in-page left sidebar** (a second column beside the existing `MainNav` rail), collapsing to a horizontal chip row under `lg`. This is why `AppShell` needed the `width="wide"` option.
4. **Sidebar counts are whole-collection totals, not filtered counts.** With AND filtering, filtered counts collapse to zero for almost every unselected tag the moment one is active, which makes the sidebar useless for navigating onwards. Totals stay stable while you type. As a bonus, `tags` never changes in response to `q`/`tags`/`page`, so it's excluded from the live-search partial reload and the counts query doesn't run on every keystroke.
5. **URL contract is `?q=…&tags=design,react&page=2`** — comma-joined tag **names**, not IDs, so links are readable and stay valid. This is why `Tag` validates that names contain no comma. Names that don't resolve for the current user are silently dropped and omitted from the echoed-back `filters` prop, so a stale shared link can't render a phantom chip.
6. **Tag colours are auto-assigned and deterministic** — `Zlib.crc32(name) % 8`, so the same tag name always gets the same colour for every user. Editable afterwards on the Tags page. Represented as one of eight `--color-tag-*` design tokens rather than raw hex.
7. **Colour lives on a dot, not the pill.** Tag pills are the existing neutral `<Badge>` with a coloured dot. This needs 8 tokens instead of 16 (no faded pairs) and leaves pill contrast governed by the existing badge tones in both themes.
8. **Title fetch is synchronous**, via a non-Inertia `GET /bookmarks/title_preview` JSON endpoint called from the dialog with raw `fetch()` on the URL field's blur. The user is never blocked (they keep typing), so a job queue plus status polling would be a lot of machinery for a bounded ~5s request. Timeouts: 3s open / 5s read, max 3 redirects, 512 KB body cap. **This is the documented candidate for moving into Solid Queue alongside the summarizer** if it ever causes thread pressure — the seam (`PageTitleFetcher`) is already in the right place.
9. **The title fetcher is SSRF-hardened**, because it makes a server-side request to a user-supplied URL. Guards, re-applied on *every* redirect hop: `http`/`https` only; ports 80/443 only; no `user:pass@` in the URL; DNS resolved up front with **every** answer required to be public (`loopback?`/`private?`/`link_local?` plus explicit CIDRs for CGNAT, multicast, reserved, and IPv6 ranges Ruby's predicates miss); and `Net::HTTP#ipaddr=` pins the socket to the vetted address while leaving `Host`, SNI, and certificate verification bound to the hostname — closing the DNS-rebinding window between check and connect. Every failure returns a uniform `{"title": null}` so the endpoint can't be used as an internal port scanner.
10. **No tag-autocomplete endpoint.** The bookmarks index already ships the user's full tag list as a prop and `TagInput` filters it client-side. A personal tag vocabulary is tens of entries. **Don't reintroduce one** — it would add an endpoint, a loading state, and a class of debounce bugs for no gain.
11. **No `create` action on `TagsController`.** Tags are only born from a bookmark save; the management page renames/recolours/deletes.
12. **Rename collisions error rather than merge** ("Name has already been taken"). Silently merging two tags is destructive and not undoable from the UI.
13. **No uniqueness constraint on `bookmarks.url`.** Saving the same URL twice with different notes is legitimate, and any constraint is only as good as URL normalization (`http` vs `https`, `www.`, trailing slashes, `?utm_*`).
14. **`title` is optional.** If the fetch fails and the user types nothing, the card falls back to the domain. That *is* the PRD's "falls back to manual entry" path.
15. **Dates are formatted server-side** (`created_at_label`, in the user's timezone) rather than with `toLocaleDateString` in the browser. SSR is on in production, and client-side locale formatting resolves against Node's locale during SSR and the browser's on hydration — a guaranteed hydration mismatch. The ISO string is still sent for `<time dateTime>`.
16. **Validation errors come from Inertia's `useForm` error bag**, not the shared `props.errors`, so a field's error can be cleared with `clearErrors` as soon as the user starts fixing it. Without this the stale message hangs around until the next round-trip.
17. **Both delete confirms are `<Dialog>`, never `window.confirm`** — a native modal blocks the event loop, which breaks browser automation, and can't be themed.

---

## Things milestone 2 will need to know

### The AI columns already exist and are unused

`bookmarks.ai_summary` (text) and `bookmarks.ai_status` (string, default `"pending"`) are on the table and serialized into the `bookmarks` prop. `Bookmark` has:

```ruby
enum :ai_status, { pending: "pending", done: "done", failed: "failed" }, validate: true
```

Every bookmark created in milestone 1 is `pending`. **No migration is needed** to wire up summarization — if you want a `processing` state, add it to the enum hash (no DB change, since it's a string column).

### Where to hook the job

- **Enqueue** from `BookmarksController#create` (and `#update` when the URL changes) — look for `save_with_tags`. Solid Queue is already installed and running under `bin/dev`; nothing is enqueued today.
- **`PageTitleFetcher` is reusable inside the summarizer job.** It already does the hardened fetch; the summarizer needs the page *body*, so extract or expose the body-reading step rather than writing a second fetcher — and keep the SSRF guards, they matter just as much there.

### Where the summary renders

`app/javascript/pages/bookmarks/BookmarkCard.tsx` currently renders notes and then the tag pills. There is a deliberate gap between them for the summary — add a block keyed off `bookmark.ai_status`:

- `pending` → "Summarizing…"
- `done` → `bookmark.ai_summary` (plain text, no markdown)
- `failed` → "Summary unavailable"

`ai_summary` and `ai_status` are already on the `Bookmark` TypeScript type in `app/frontend/types/bookmarks.ts`.

### Search must be extended

`Bookmark.search` deliberately covers **title, url, notes only**:

```ruby
where("bookmarks.title ILIKE :term OR bookmarks.url ILIKE :term OR bookmarks.notes ILIKE :term", term: term)
```

Milestone 2 adds `OR bookmarks.ai_summary ILIKE :term`. There is a model test (`"search matches title, url, and notes case-insensitively"`) to extend alongside it.

### "Regenerate summary"

Add it to the card's existing `DropdownMenu` in `BookmarkCard.tsx` (next to Edit/Delete). It must be a `router.post`/`router.patch` to a route that **redirects** — never `head :ok` (see the Inertia rule in `CLAUDE.md`). `redirect_back fallback_location: bookmarks_path` matches what create/update/destroy already do and preserves the user's filters.

### Conventions worth matching

- Serialization is hand-rolled private `bookmark_summary` / `tag_summary` methods in the controller, timestamps as `.iso8601`.
- Params are flat `params.permit(:url, :title, :notes)` — no `params.require(:bookmark)` anywhere in this codebase. `tag_names` is read straight off `params` (not strong params) because `permit(tag_names: [])` yields `nil` for an empty array, which would make "clear all tags" a silent no-op.
- Controller tests hit Inertia with `X-Inertia` + `X-Inertia-Version` headers (see the private `get` override in `bookmarks_controller_test.rb`) and read `response.parsed_body["props"]`.
- Mutations assert `assert_response :redirect`, and cross-user access returns **404** (`show_exceptions = :rescuable` in the test env) rather than raising.

### Gotchas discovered the hard way

- **`.modal` is a scroll container** (`overflow-y-auto`, `max-h-[calc(100dvh-2rem)]`). An absolutely-positioned overlay inside `DialogContent` gets clipped at the dialog's edge. That's why `TagInput`'s suggestion listbox is **in-flow** — verified visually. Same applies to anything else you drop into that dialog.
- **Radix Dialog listens for Escape in the capture phase on `document`** (`@radix-ui/react-use-escape-keydown`), so `stopPropagation()` in a React handler cannot intercept it. The sanctioned hatch is `DialogContent`'s `onEscapeKeyDown` + `event.preventDefault()`. `TagInput` exposes `onListboxOpenChange` for exactly this; `BookmarkFormDialog` uses it so Escape closes the suggestions first and the dialog only on a second press.
- **`sanitize_sql_like` is not a public class method**, so `search`/`tagged_with_all` are `def self.…` class methods rather than `scope` lambdas (a scope body evaluates against the relation).
- **`count` on a relation with `group` returns a Hash.** That's the whole reason `tagged_with_all` pushes its `GROUP BY … HAVING` into a subquery and leaves the outer relation a plain `WHERE … IN (…)`. If anyone "simplifies" it to `joins(:tags).group(:id).having(...)`, `total_count` silently becomes a hash and pagination breaks. There's a model test asserting no duplicate rows to guard it.
- **`redirect()` in routes defaults to 301**, not 302. The `/dashboard` → `/bookmarks` route passes `status: 302` explicitly so it isn't permanently cached in browsers. There's a test asserting the 302.

---

## Deviations from the PRD

1. **"URL paste triggers background title fetch"** — implemented as a request that's asynchronous *from the user's perspective* (fired on the URL field's blur, they keep typing while it resolves) rather than a Solid Queue job. See decision 8 for the reasoning and the documented upgrade path. The observable behaviour matches the PRD, including the manual-entry fallback.

2. **`/dashboard` was replaced rather than left alongside.** The PRD says "Bookmarks page as the logged-in home"; the starter shipped a placeholder Dashboard at that position. Confirmed with the user: `/dashboard` now 302s to `/bookmarks` and the placeholder page and controller are deleted, so there's no dead screen in the app.

3. **Three design-system additions were made** (`TagInput`, `Pagination`, tag-colour tokens) rather than page-local one-offs. `CLAUDE.md` rule 4 says to propose system additions by default; confirmed with the user before building. Each has a documented section on `/admin/design-system`.

4. **`AppShell` gained a `width` prop.** Not in the PRD, but the bookmarks page is a two-column layout sitting beside the existing nav rail and the shell's `max-w-4xl` (896px) left the cards cramped. The prop is additive with an unchanged default.

5. **Two dependency changes were needed that aren't feature work:**
   - **`gem "minitest", "~> 5.25"` was pinned.** `Gemfile.lock` had drifted to minitest 6.0.6, which is incompatible with Rails 8.0.4's test runner (`Rails::LineFiltering#run`: "wrong number of arguments (given 3, expected 1..2)"). **This broke the entire suite before any of this milestone's code existed** — the pre-existing `sessions_controller_test.rb` failed identically. Pinning restores it.
   - **`gem "nokogiri"` was declared.** It was already resolved in `Gemfile.lock` as a transitive dependency, so this pins no new version — it just stops `PageTitleFetcher` depending on an undeclared gem.

   Separately, and **not fixed**: `.ruby-version` says `3.3.6` but the active interpreter is Ruby 4.0.5. Everything passes on 4.0.5, but that mismatch is worth a deliberate decision rather than a silent one.

6. **Search covers title, URL, and notes only** — per the PRD's own "Not in this milestone: search across AI summary text."

---

## Verification

```
bin/rubocop      66 files, no offenses
npm run check    clean
bin/rails test   95 runs, 276 assertions, 0 failures, 0 errors (green 3 consecutive runs)
bin/brakeman     0 errors, 1 warning (pre-existing Rails 8.0.4 EOL notice)
```

Manually driven end to end in Chrome against `PORT=4000 VITE_RUBY_PORT=4036 bin/dev` (port 3000 left alone for the human's own server), covering every "Done when" criterion: login → `/bookmarks`, paste-to-autofill-title (verified a real fetch returning "Example Domain", and the graceful empty-title fallback), tag autocomplete + on-the-fly creation + full keyboard nav, live search matching a notes-only term with focus retained, two-tag AND filtering, shareable filtered URLs, pagination, edit, delete-with-confirm, tag rename/recolour/delete-with-impact-count, rename-collision error, both empty states, mobile at 400px, light and dark themes, and all three new design-system sections. **Browser console clean throughout** — the only messages were Chrome-extension noise and two pre-existing Milkdown warnings on `/admin/design-system`.

Screenshots in `tmp/screenshots/`: `bookmarks-desktop-light.jpg`, `bookmarks-desktop-dark.jpg`, `bookmarks-mobile-400.jpg`, `bookmarks-empty-first-run.jpg`, `tags-desktop-dark.jpg`.
