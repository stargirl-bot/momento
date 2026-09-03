require "test_helper"

class BookmarksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @bookmark = bookmarks(:rails_guides)
  end

  # --- access ---

  test "unauthenticated users are redirected to login" do
    get bookmarks_path
    assert_redirected_to login_path
  end

  test "bookmarks is the logged-in home" do
    log_in_as(@user)
    assert_redirected_to bookmarks_path

    get root_path
    assert_redirected_to bookmarks_path

    # 302, not Rails' 301 default — a permanent redirect would be cached in
    # browsers forever.
    get dashboard_path
    assert_response 302
    assert_redirected_to bookmarks_path
  end

  # --- index ---

  test "index renders successfully" do
    log_in_as(@user)
    get bookmarks_path
    assert_response :success
  end

  test "index only exposes the current user's bookmarks" do
    log_in_as(@user)
    get bookmarks_path

    ids = inertia_props["bookmarks"].map { |bookmark| bookmark["id"] }
    assert_equal @user.bookmarks.pluck(:id).sort, ids.sort
    assert_not_includes ids, bookmarks(:other_users_bookmark).id
  end

  test "index formats the saved date server-side for hydration safety" do
    log_in_as(@user)
    get bookmarks_path

    bookmark = inertia_props["bookmarks"].find { |b| b["id"] == @bookmark.id }
    assert_equal "Apr 20, 2026", bookmark["created_at_label"]
    assert bookmark["created_at"].start_with?("2026-04-20")
  end

  test "index orders newest first" do
    log_in_as(@user)
    get bookmarks_path
    assert_equal [ "Tailwind CSS Documentation", "Inertia.js — The Modern Monolith", "Ruby on Rails Guides" ],
                 inertia_props["bookmarks"].map { |bookmark| bookmark["title"] }
  end

  test "index filters by search query" do
    log_in_as(@user)
    get bookmarks_path(q: "tailwind")

    titles = inertia_props["bookmarks"].map { |bookmark| bookmark["title"] }
    assert_equal [ "Tailwind CSS Documentation" ], titles
    assert_equal "tailwind", inertia_props["filters"]["q"]
  end

  test "index search covers notes as well as title and url" do
    log_in_as(@user)
    get bookmarks_path(q: "adapter bridges")
    assert_equal [ bookmarks(:inertia_docs).id ], inertia_props["bookmarks"].map { |b| b["id"] }
  end

  test "index tag filter uses AND, not OR" do
    log_in_as(@user)

    get bookmarks_path(tags: "react")
    assert_equal 2, inertia_props["bookmarks"].size

    get bookmarks_path(tags: "design,react")
    assert_equal [ @bookmark.id ], inertia_props["bookmarks"].map { |b| b["id"] }
    assert_equal %w[ design react ], inertia_props["filters"]["tags"].sort
  end

  test "index composes search with tag filters" do
    log_in_as(@user)
    get bookmarks_path(q: "guides", tags: "react")
    assert_equal [ @bookmark.id ], inertia_props["bookmarks"].map { |b| b["id"] }
  end

  test "index ignores tag names belonging to another user" do
    log_in_as(users(:two))
    get bookmarks_path(tags: "react")

    assert_empty inertia_props["filters"]["tags"]
    assert_equal [ bookmarks(:other_users_bookmark).id ], inertia_props["bookmarks"].map { |b| b["id"] }
  end

  test "index exposes tags with whole-collection counts" do
    log_in_as(@user)
    get bookmarks_path(tags: "design")

    counts = inertia_props["tags"].to_h { |tag| [ tag["name"], tag["bookmarks_count"] ] }
    assert_equal({ "design" => 1, "react" => 2, "unused" => 0 }, counts)
  end

  # --- pagination ---

  test "index paginates and clamps out-of-range pages" do
    log_in_as(@user)
    25.times { |i| @user.bookmarks.create!(url: "https://example.com/#{i}", title: "Extra #{i}") }

    get bookmarks_path
    assert_equal 20, inertia_props["bookmarks"].size
    assert_equal 28, inertia_props["pagination"]["total_count"]
    assert_equal 2, inertia_props["pagination"]["total_pages"]

    get bookmarks_path(page: 2)
    assert_equal 8, inertia_props["bookmarks"].size
    assert_equal 2, inertia_props["pagination"]["current_page"]

    get bookmarks_path(page: 999)
    assert_response :success
    assert_equal 2, inertia_props["pagination"]["current_page"]
  end

  test "index survives garbage page values" do
    log_in_as(@user)

    [ "abc", "-5", "0", "" ].each do |page|
      get bookmarks_path(page: page)
      assert_response :success
      assert_equal 1, inertia_props["pagination"]["current_page"]
    end
  end

  # --- create ---

  test "creates a bookmark and redirects" do
    log_in_as(@user)

    assert_difference -> { @user.bookmarks.count }, 1 do
      post bookmarks_path, params: { url: "https://example.com/new", title: "New one", notes: "hi" }
    end

    assert_response :redirect
    assert_equal "Bookmark saved.", flash[:notice]
    assert_equal "New one", @user.bookmarks.order(:created_at).last.title
  end

  test "creating with tag names creates the missing tags" do
    log_in_as(@user)

    # "design" already exists; "Brand New" is created, normalized to one
    # lowercase, space-preserving name.
    assert_difference -> { Tag.count }, 1 do
      post bookmarks_path, params: { url: "https://example.com/tagged", tag_names: [ "design", "Brand New" ] }
    end

    bookmark = @user.bookmarks.order(:created_at).last
    assert_equal [ "brand new", "design" ], bookmark.tags.map(&:name).sort
  end

  test "an invalid create redirects with errors and saves nothing" do
    log_in_as(@user)

    assert_no_difference -> { Bookmark.count } do
      post bookmarks_path, params: { url: "javascript:alert(1)" }
    end

    assert_response :redirect
    # inertia_rails stashes the errors hash in the session, where the shared
    # `errors` prop picks it up on the next render.
    assert_equal "Url must be a valid http:// or https:// address", session[:inertia_errors][:url]
  end

  # --- update ---

  test "updates a bookmark and replaces its tags" do
    log_in_as(@user)

    patch bookmark_path(@bookmark), params: { url: @bookmark.url, title: "Renamed", tag_names: [ "react" ] }

    assert_response :redirect
    assert_equal "Renamed", @bookmark.reload.title
    assert_equal [ "react" ], @bookmark.tags.map(&:name)
  end

  test "clearing tag names removes every tag" do
    log_in_as(@user)
    patch bookmark_path(@bookmark), params: { url: @bookmark.url, tag_names: [] }
    assert_empty @bookmark.reload.tags
  end

  test "cannot update another user's bookmark" do
    log_in_as(@user)
    other = bookmarks(:other_users_bookmark)

    patch bookmark_path(other), params: { title: "Hijacked" }

    assert_response :not_found
    assert_equal "Not yours", other.reload.title
  end

  # --- destroy ---

  test "destroys a bookmark and redirects" do
    log_in_as(@user)

    assert_difference -> { @user.bookmarks.count }, -1 do
      delete bookmark_path(@bookmark)
    end

    assert_response :redirect
    assert_equal "Bookmark deleted.", flash[:notice]
  end

  test "cannot destroy another user's bookmark" do
    log_in_as(@user)

    assert_no_difference -> { Bookmark.count } do
      delete bookmark_path(bookmarks(:other_users_bookmark))
    end

    assert_response :not_found
  end

  # --- title preview ---

  test "title_preview returns json and requires authentication" do
    get bookmark_title_preview_path(url: "https://example.com")
    assert_redirected_to login_path

    log_in_as(@user)
    get bookmark_title_preview_path(url: "http://127.0.0.1/secret")

    assert_response :success
    assert_nil response.parsed_body["title"]
  end

  private
    # Inertia renders JSON when asked for it, which is the cleanest way to
    # assert on props from an integration test.
    def inertia_props
      response.parsed_body["props"]
    end

    def get(path, **options)
      super(path, **options, headers: { "X-Inertia" => "true", "X-Inertia-Version" => InertiaRails.configuration.version }.merge(options[:headers] || {}))
    end
end
