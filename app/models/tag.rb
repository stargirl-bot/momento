class Tag < ApplicationRecord
  # Fixed palette backing the --color-tag-* design tokens. A tag's slot is
  # derived from its name so the same label always reads the same colour, and
  # saving a bookmark never asks the user to pick one. Editable afterwards on
  # the tag management page.
  COLORS = %w[ tag-1 tag-2 tag-3 tag-4 tag-5 tag-6 tag-7 tag-8 ].freeze

  belongs_to :user
  has_many :bookmark_tags, dependent: :destroy
  has_many :bookmarks, through: :bookmark_tags

  normalizes :name, with: ->(name) { name.to_s.squish.downcase }

  # Commas are the delimiter in the ?tags= query param, so a name may not
  # contain one (see the URL contract in BookmarksController).
  validates :name, presence: true, length: { maximum: 40 },
                   uniqueness: { scope: :user_id },
                   format: { without: /,/, message: "can't contain a comma" }
  validates :color, inclusion: { in: COLORS }

  before_validation :assign_color, on: :create

  scope :alphabetical, -> { order(:name) }

  def self.color_for(name)
    COLORS[Zlib.crc32(name.to_s) % COLORS.size]
  end

  private
    def assign_color
      self.color = self.class.color_for(name) if color.blank?
    end
end
