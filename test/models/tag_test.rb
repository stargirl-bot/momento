require "test_helper"

class TagTest < ActiveSupport::TestCase
  setup do
    @user = users(:one)
  end

  test "normalizes the name to squished lowercase" do
    assert_equal "machine learning", @user.tags.create!(name: "  Machine   LEARNING ").name
  end

  test "requires a name" do
    assert_not @user.tags.build(name: " ").valid?
  end

  test "rejects commas so the ?tags= delimiter stays unambiguous" do
    tag = @user.tags.build(name: "a,b")
    assert_not tag.valid?
    assert_includes tag.errors[:name], "can't contain a comma"
  end

  test "name is unique per user, case-insensitively" do
    duplicate = @user.tags.build(name: "DESIGN")
    assert_not duplicate.valid?
    assert_includes duplicate.errors[:name], "has already been taken"
  end

  test "a different user may reuse a name" do
    assert users(:two).tags.build(name: "react").valid?
  end

  test "assigns a deterministic colour from the palette on create" do
    first  = @user.tags.create!(name: "research")
    second = users(:two).tags.create!(name: "research")

    assert_includes Tag::COLORS, first.color
    assert_equal first.color, second.color
  end

  test "an explicit colour survives creation" do
    assert_equal "tag-5", @user.tags.create!(name: "manual", color: "tag-5").color
  end

  test "rejects a colour outside the palette" do
    assert_not @user.tags.build(name: "bad", color: "#ff0000").valid?
  end

  test "destroying a tag detaches it from bookmarks without deleting them" do
    assert_difference -> { BookmarkTag.count }, -1 do
      assert_no_difference -> { Bookmark.count } do
        tags(:design).destroy!
      end
    end

    assert_not_includes bookmarks(:rails_guides).reload.tags, tags(:design)
  end

  test "alphabetical orders by name" do
    assert_equal %w[ design react unused ], @user.tags.alphabetical.map(&:name)
  end
end
