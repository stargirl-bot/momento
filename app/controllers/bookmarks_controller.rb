class BookmarksController < ApplicationController
  PER_PAGE = 20

  def index
    scope = filtered_bookmarks

    total_count = scope.count
    total_pages = [ (total_count / PER_PAGE.to_f).ceil, 1 ].max
    page        = params[:page].to_i.clamp(1, total_pages)

    bookmarks = scope.newest_first
                     .includes(:tags)
                     .offset((page - 1) * PER_PAGE)
                     .limit(PER_PAGE)

    render inertia: "bookmarks/Index", props: {
      bookmarks: bookmarks.map { |bookmark| bookmark_summary(bookmark) },
      tags: tags_with_counts,
      pagination: {
        current_page: page,
        total_pages: total_pages,
        total_count: total_count,
        per_page: PER_PAGE
      },
      filters: {
        q: search_query,
        tags: filter_tags.map(&:name)
      },
      # The whole collection's size, independent of the active filters — the
      # page header and the sidebar's "All bookmarks" row both describe the
      # library, not the current result set.
      total_bookmarks: Current.user.bookmarks.count
    }
  end

  def create
    bookmark = Current.user.bookmarks.build(bookmark_params)

    if save_with_tags(bookmark)
      redirect_back fallback_location: bookmarks_path, notice: "Bookmark saved."
    else
      redirect_back fallback_location: bookmarks_path, inertia: { errors: error_messages(bookmark) }
    end
  end

  def update
    bookmark = Current.user.bookmarks.find(params[:id])
    bookmark.assign_attributes(bookmark_params)

    if save_with_tags(bookmark)
      redirect_back fallback_location: bookmarks_path, notice: "Bookmark updated."
    else
      redirect_back fallback_location: bookmarks_path, inertia: { errors: error_messages(bookmark) }
    end
  end

  def destroy
    Current.user.bookmarks.find(params[:id]).destroy!
    redirect_back fallback_location: bookmarks_path, notice: "Bookmark deleted."
  end

  # Called with raw fetch() from the new/edit dialog, not through Inertia's
  # router, so a JSON response is correct here.
  def title_preview
    render json: { title: PageTitleFetcher.call(params[:url]) }
  end

  private
    def filtered_bookmarks
      scope = Current.user.bookmarks
      scope = scope.search(search_query) if search_query.present?
      scope.tagged_with_all(filter_tags.map(&:id))
    end

    def search_query
      @search_query ||= params[:q].to_s.strip
    end

    # ?tags=design,react — names rather than ids so the URL stays readable and
    # shareable. Names owned by another user simply don't resolve.
    def filter_tags
      @filter_tags ||= begin
        names = params[:tags].to_s.split(",").map { |name| name.strip.downcase }.reject(&:blank?).uniq
        names.any? ? Current.user.tags.where(name: names).to_a : []
      end
    end

    def tags_with_counts
      counts = BookmarkTag.joins(:bookmark)
                          .where(bookmarks: { user_id: Current.user.id })
                          .group(:tag_id)
                          .count

      Current.user.tags.alphabetical.map do |tag|
        tag_summary(tag).merge(bookmarks_count: counts.fetch(tag.id, 0))
      end
    end

    def save_with_tags(bookmark)
      Bookmark.transaction do
        bookmark.save!
        bookmark.tag_ids = resolve_tag_ids
      end
      true
    rescue ActiveRecord::RecordInvalid
      false
    end

    # "Tags created on the fly": any name that isn't already one of the user's
    # tags becomes one.
    def resolve_tag_ids
      names = Array(params[:tag_names]).map { |name| name.to_s.squish.downcase }.reject(&:blank?).uniq
      names.map { |name| Current.user.tags.find_or_create_by!(name: name).id }
    end

    def bookmark_params
      params.permit(:url, :title, :notes)
    end

    def error_messages(record)
      record.errors.to_hash(true).transform_values(&:first)
    end

    def bookmark_summary(bookmark)
      {
        id: bookmark.id,
        url: bookmark.url,
        title: bookmark.title.presence,
        host: bookmark.host,
        notes: bookmark.notes.presence,
        ai_summary: bookmark.ai_summary.presence,
        ai_status: bookmark.ai_status,
        created_at: bookmark.created_at.iso8601,
        created_at_label: saved_at_label(bookmark.created_at),
        tags: bookmark.tags.sort_by(&:name).map { |tag| tag_summary(tag) }
      }
    end

    def tag_summary(tag)
      { id: tag.id, name: tag.name, color: tag.color }
    end

    # Formatted here, in the user's timezone, so SSR and client hydration
    # produce identical markup — toLocaleDateString in the browser would
    # resolve against Node's locale during SSR and the browser's on hydration.
    def saved_at_label(time)
      time.in_time_zone(Current.user.timezone.presence || "UTC").strftime("%b %-d, %Y")
    rescue ArgumentError
      time.utc.strftime("%b %-d, %Y")
    end
end
