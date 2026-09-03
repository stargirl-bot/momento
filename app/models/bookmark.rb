class Bookmark < ApplicationRecord
  belongs_to :user
  has_many :bookmark_tags, dependent: :destroy
  has_many :tags, through: :bookmark_tags

  # ai_summary / ai_status are written by the summarisation job in a later
  # milestone; every bookmark starts out "pending".
  enum :ai_status, { pending: "pending", done: "done", failed: "failed" }, validate: true

  normalizes :url, with: ->(url) { url.to_s.strip }
  normalizes :title, with: ->(title) { title.to_s.squish }

  validates :url, presence: true, length: { maximum: 2048 }
  validates :title, length: { maximum: 255 }
  validate :url_must_be_http

  # id tiebreak keeps LIMIT/OFFSET pagination stable when timestamps collide.
  scope :newest_first, -> { order(created_at: :desc, id: :desc) }

  # Case-insensitive substring search. The term stays a bind parameter, and
  # sanitize_sql_like escapes % and _ so they match literally. Defined as a
  # class method rather than a scope because sanitize_sql_like is not public.
  def self.search(query)
    term = "%#{sanitize_sql_like(query.to_s.strip)}%"
    where("bookmarks.title ILIKE :term OR bookmarks.url ILIKE :term OR bookmarks.notes ILIKE :term", term: term)
  end

  # AND semantics: a bookmark must carry *every* given tag. Uses a grouped
  # subquery rather than repeated joins so the result has one row per bookmark
  # — a joins-based version returns duplicates that break both .count and
  # LIMIT/OFFSET.
  def self.tagged_with_all(tag_ids)
    ids = Array(tag_ids).uniq
    return all if ids.empty?

    where(id: BookmarkTag.where(tag_id: ids)
                         .group(:bookmark_id)
                         .having("COUNT(DISTINCT bookmark_tags.tag_id) = ?", ids.size)
                         .select(:bookmark_id))
  end

  def host
    URI.parse(url).host
  rescue URI::InvalidURIError
    nil
  end

  private
    def url_must_be_http
      return if url.blank?

      parsed = URI.parse(url)
      unless parsed.is_a?(URI::HTTP) && parsed.host.present?
        errors.add(:url, "must be a valid http:// or https:// address")
      end
    rescue URI::InvalidURIError
      errors.add(:url, "must be a valid http:// or https:// address")
    end
end
