ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

# Build the Vite test bundle once, here in the parent process, before
# parallelize() forks its workers.
#
# Otherwise each worker triggers ViteRuby's lazy auto-build on its first
# asset request, and concurrent `vite build` runs fight over public/vite-test:
# the losers either die with ENOTEMPTY while emptying the out dir or read a
# half-written manifest and raise "Vite Ruby can't find
# entrypoints/application.css in the manifests". That made the suite flaky
# from the moment it crossed parallelize's 50-test threshold. The build is
# idempotent — it no-ops when the watched files haven't changed.
ViteRuby.instance.builder.build if ViteRuby.config.auto_build

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    fixtures :all

    # Add more helper methods to be used by all tests here...
  end
end

class ActionDispatch::IntegrationTest
  # Every user fixture shares the same password (see test/fixtures/users.yml),
  # so logging in only needs the record.
  def log_in_as(user, password: "password")
    post login_path, params: { email: user.email, password: password }
  end
end
