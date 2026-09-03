require "application_system_test_case"

# The bookmark dialog is driven entirely by React state, so its pre-fill and
# reset behaviour is invisible to controller tests — the only thing that can
# catch a regression here is a real browser.
class BookmarkFormDialogTest < ApplicationSystemTestCase
  setup do
    @user = users(:one)
    @bookmark = bookmarks(:rails_guides)
    log_in_as @user
  end

  test "edit dialog pre-fills the bookmark on the first open" do
    visit bookmarks_path
    open_edit_dialog_for @bookmark

    # Regressed once because useForm#reset() reads the `defaults` captured in
    # the current render, so a setDefaults() in the same effect hadn't landed
    # and the first open reset every field to blank.
    assert_field "URL", with: @bookmark.url
    assert_field "Title", with: @bookmark.title
    assert_field "Notes", with: @bookmark.notes
    assert_text @bookmark.tags.first.name if @bookmark.tags.any?
  end

  test "create dialog opens blank after an edit dialog has been used" do
    visit bookmarks_path
    open_edit_dialog_for @bookmark
    click_on "Cancel"

    click_on "New bookmark"
    assert_selector "h2", text: "New bookmark"

    # The mirror of the bug above: stale defaults leaking the other direction
    # would pre-fill a new bookmark with the one just edited.
    assert_field "URL", with: ""
    assert_field "Title", with: ""
    assert_field "Notes", with: ""
  end

  test "switching between two bookmarks pre-fills each one" do
    other = bookmarks(:inertia_docs)
    visit bookmarks_path

    open_edit_dialog_for @bookmark
    assert_field "URL", with: @bookmark.url
    click_on "Cancel"

    open_edit_dialog_for other
    assert_field "URL", with: other.url
    assert_field "Title", with: other.title
  end

  private
    def log_in_as(user, password: "password")
      visit login_path
      fill_in "Email", with: user.email
      fill_in "Password", with: password
      click_on "Log in"
      assert_selector "h1", text: "Bookmarks"
    end

    # The menu items are Radix menuitems, not buttons, so click_on can't see them.
    def open_edit_dialog_for(bookmark)
      find("button[aria-label='Actions for #{bookmark.title}']").click
      find("[role='menuitem']", text: "Edit").click
      assert_selector "h2", text: "Edit bookmark"
    end
end
