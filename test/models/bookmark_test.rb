require "test_helper"

class BookmarkTest < ActiveSupport::TestCase
  setup do
    @user = users(:one)
  end

  test "requires a url" do
    bookmark = @user.bookmarks.build(url: "")
    assert_not bookmark.valid?
    assert_includes bookmark.errors[:url], "can't be blank"
  end

  test "accepts http and https urls" do
    assert @user.bookmarks.build(url: "http://example.com").valid?
    assert @user.bookmarks.build(url: "https://example.com/path?a=b").valid?
  end

  test "rejects non-http schemes" do
    [ "javascript:alert(1)", "ftp://example.com", "example.com", "mailto:a@b.com" ].each do |url|
      bookmark = @user.bookmarks.build(url: url)
      assert_not bookmark.valid?, "expected #{url.inspect} to be invalid"
      assert_includes bookmark.errors[:url], "must be a valid http:// or https:// address"
    end
  end

  test "strips surrounding whitespace from the url" do
    bookmark = @user.bookmarks.create!(url: "  https://example.com  ")
    assert_equal "https://example.com", bookmark.url
  end

  test "starts out pending a summary" do
    assert_equal "pending", @user.bookmarks.create!(url: "https://example.com").ai_status
  end

  test "newest_first orders by created_at descending" do
    assert_equal [ bookmarks(:tailwind_docs), bookmarks(:inertia_docs), bookmarks(:rails_guides) ],
                 @user.bookmarks.newest_first.to_a
  end

  test "search matches title, url, and notes case-insensitively" do
    assert_includes @user.bookmarks.search("RAILS"), bookmarks(:rails_guides)
    assert_includes @user.bookmarks.search("tailwindcss.com"), bookmarks(:tailwind_docs)
    assert_includes @user.bookmarks.search("adapter bridges"), bookmarks(:inertia_docs)
  end

  test "search excludes non-matches and never crosses users" do
    assert_not_includes @user.bookmarks.search("tailwind"), bookmarks(:rails_guides)
    assert_empty @user.bookmarks.search("Not yours")
  end

  test "search treats wildcard characters literally" do
    assert_empty @user.bookmarks.search("%")
    assert_empty @user.bookmarks.search("_")
  end

  test "tagged_with_all is a no-op when given no tags" do
    assert_equal @user.bookmarks.count, @user.bookmarks.tagged_with_all([]).count
  end

  test "tagged_with_all requires every tag, not any" do
    design = tags(:design)
    react  = tags(:react)

    assert_equal [ bookmarks(:rails_guides) ], @user.bookmarks.tagged_with_all([ design.id ]).to_a
    assert_equal [ bookmarks(:rails_guides) ], @user.bookmarks.tagged_with_all([ design.id, react.id ]).to_a
    assert_equal [ bookmarks(:inertia_docs), bookmarks(:rails_guides) ],
                 @user.bookmarks.tagged_with_all([ react.id ]).order(:id).to_a
  end

  test "tagged_with_all returns no duplicate rows" do
    scope = @user.bookmarks.tagged_with_all([ tags(:design).id, tags(:react).id ])
    assert_equal 1, scope.count
    assert_equal 1, scope.to_a.size
  end

  test "search and tagged_with_all compose" do
    scope = @user.bookmarks.search("guides").tagged_with_all([ tags(:react).id ])
    assert_equal [ bookmarks(:rails_guides) ], scope.to_a
  end

  test "host extracts the domain" do
    assert_equal "guides.rubyonrails.org", bookmarks(:rails_guides).host
  end

  test "destroying a bookmark removes its tag links but not the tags" do
    assert_difference -> { BookmarkTag.count }, -2 do
      assert_no_difference -> { Tag.count } do
        bookmarks(:rails_guides).destroy!
      end
    end
  end
end
