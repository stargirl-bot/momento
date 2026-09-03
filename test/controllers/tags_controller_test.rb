require "test_helper"

class TagsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:one)
    @tag = tags(:design)
  end

  test "unauthenticated users are redirected to login" do
    get tags_path
    assert_redirected_to login_path
  end

  test "index renders successfully" do
    log_in_as(@user)
    get tags_path
    assert_response :success
  end

  test "index lists only the current user's tags with counts" do
    log_in_as(@user)
    get tags_path

    tags = response.parsed_body["props"]["tags"]
    assert_equal %w[ design react unused ], tags.map { |tag| tag["name"] }
    assert_equal({ "design" => 1, "react" => 2, "unused" => 0 },
                 tags.to_h { |tag| [ tag["name"], tag["bookmarks_count"] ] })
  end

  test "index exposes the colour palette" do
    log_in_as(@user)
    get tags_path
    assert_equal Tag::COLORS, response.parsed_body["props"]["colors"]
  end

  test "renames a tag" do
    log_in_as(@user)
    patch tag_path(@tag), params: { name: "Visual Design" }

    assert_redirected_to tags_path
    assert_equal "visual design", @tag.reload.name
  end

  test "recolours a tag" do
    log_in_as(@user)
    patch tag_path(@tag), params: { color: "tag-7" }

    assert_redirected_to tags_path
    assert_equal "tag-7", @tag.reload.color
  end

  test "a rename that collides surfaces an error and changes nothing" do
    log_in_as(@user)
    patch tag_path(@tag), params: { name: "react" }

    assert_redirected_to tags_path
    assert_equal "Name has already been taken", session[:inertia_errors][:name]
    assert_equal "design", @tag.reload.name
  end

  test "deleting a tag keeps its bookmarks" do
    log_in_as(@user)

    assert_difference -> { Tag.count }, -1 do
      assert_no_difference -> { Bookmark.count } do
        delete tag_path(@tag)
      end
    end

    assert_redirected_to tags_path
    assert_equal "Tag deleted.", flash[:notice]
    assert_not_includes bookmarks(:rails_guides).reload.tags.map(&:name), "design"
  end

  test "cannot touch another user's tag" do
    log_in_as(@user)
    other = tags(:other_design)

    patch tag_path(other), params: { name: "hijacked" }
    assert_response :not_found

    assert_no_difference -> { Tag.count } do
      delete tag_path(other)
    end
    assert_response :not_found
  end

  private
    def get(path, **options)
      super(path, **options, headers: { "X-Inertia" => "true", "X-Inertia-Version" => InertiaRails.configuration.version }.merge(options[:headers] || {}))
    end
end
