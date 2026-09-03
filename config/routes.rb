Rails.application.routes.draw do
  get  "login",  to: "sessions#new",     as: :login
  post "login",  to: "sessions#create"
  delete "logout", to: "sessions#destroy", as: :logout

  get  "signup", to: "registrations#new",    as: :signup
  post "signup", to: "registrations#create"

  resources :passwords, param: :token, only: %i[ new create edit update ]

  # Declared ahead of the resource so it can never be shadowed. Hit with raw
  # fetch() from the bookmark dialog, not Inertia's router.
  get "bookmarks/title_preview", to: "bookmarks#title_preview", as: :bookmark_title_preview
  resources :bookmarks, only: %i[ index create update destroy ]
  resources :tags,      only: %i[ index update destroy ]

  # Bookmarks replaced the starter dashboard as the logged-in home. Explicitly
  # 302 — redirect() defaults to a 301, which browsers cache permanently and
  # which we could never take back.
  get "dashboard", to: redirect("/bookmarks", status: 302), as: :dashboard
  get "settings",  to: "settings#show",  as: :settings

  namespace :admin do
    root to: redirect("/admin/users")
    get "design-system", to: "design_system#show", as: :design_system
    resources :users, only: %i[ index show ]
  end

  get   "profile",          to: "profiles#details",          as: :profile
  get   "profile/password", to: "profiles#password",         as: :profile_password
  patch "profile/email",    to: "profiles#update_email"
  patch "profile/password", to: "profiles#update_password"

  mount LetterOpenerWeb::Engine, at: "/letter_opener" if Rails.env.development?

  get "up" => "rails/health#show", as: :rails_health_check

  root "pages#home"
end
