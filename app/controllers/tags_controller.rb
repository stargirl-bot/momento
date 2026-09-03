class TagsController < ApplicationController
  def index
    counts = BookmarkTag.joins(:bookmark)
                        .where(bookmarks: { user_id: Current.user.id })
                        .group(:tag_id)
                        .count

    tags = Current.user.tags.alphabetical.map do |tag|
      { id: tag.id, name: tag.name, color: tag.color, bookmarks_count: counts.fetch(tag.id, 0) }
    end

    render inertia: "tags/Index", props: { tags: tags, colors: Tag::COLORS }
  end

  def update
    tag = Current.user.tags.find(params[:id])

    if tag.update(tag_params)
      redirect_to tags_path, notice: "Tag updated."
    else
      redirect_to tags_path, inertia: { errors: tag.errors.to_hash(true).transform_values(&:first) }
    end
  end

  # Destroying a tag drops its bookmark_tags rows via dependent: :destroy, so
  # the bookmarks themselves are untouched.
  def destroy
    Current.user.tags.find(params[:id]).destroy!
    redirect_to tags_path, notice: "Tag deleted."
  end

  private
    def tag_params
      params.permit(:name, :color)
    end
end
