class CreateBookmarks < ActiveRecord::Migration[8.0]
  def change
    create_table :bookmarks do |t|
      t.references :user, null: false, foreign_key: true
      t.string :url, null: false
      t.string :title
      t.text :notes
      t.text :ai_summary
      t.string :ai_status, null: false, default: "pending"

      t.timestamps
    end

    add_index :bookmarks, [ :user_id, :created_at ]
  end
end
