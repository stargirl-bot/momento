require "test_helper"

class PageTitleFetcherTest < ActiveSupport::TestCase
  # --- extract_title: the parsing half, exercised without any network ---

  test "extracts the title element" do
    html = "<html><head><title>Ruby on Rails Guides</title></head><body>hi</body></html>"
    assert_equal "Ruby on Rails Guides", PageTitleFetcher.extract_title(html)
  end

  test "squishes whitespace and newlines in the title" do
    html = "<html><head><title>\n  Spaced   out\ttitle\n</title></head></html>"
    assert_equal "Spaced out title", PageTitleFetcher.extract_title(html)
  end

  test "falls back to og:title when there is no title element" do
    html = '<html><head><meta property="og:title" content="Social Title"></head></html>'
    assert_equal "Social Title", PageTitleFetcher.extract_title(html)
  end

  test "prefers the title element over og:title" do
    html = '<html><head><title>Real</title><meta property="og:title" content="Social"></head></html>'
    assert_equal "Real", PageTitleFetcher.extract_title(html)
  end

  test "returns nil when there is no title at all" do
    assert_nil PageTitleFetcher.extract_title("<html><body>no head</body></html>")
    assert_nil PageTitleFetcher.extract_title("<html><head><title>   </title></head></html>")
    assert_nil PageTitleFetcher.extract_title("")
    assert_nil PageTitleFetcher.extract_title(nil)
  end

  test "decodes html entities" do
    html = "<html><head><title>Tips &amp; Tricks &mdash; Part 1</title></head></html>"
    assert_equal "Tips & Tricks — Part 1", PageTitleFetcher.extract_title(html)
  end

  test "copes with malformed markup" do
    html = "<html><head><title>Unclosed title<body><p>stuff"
    assert_includes PageTitleFetcher.extract_title(html), "Unclosed title"
  end

  test "truncates an over-long title" do
    html = "<html><head><title>#{'a' * 400}</title></head></html>"
    assert_equal PageTitleFetcher::MAX_TITLE_LENGTH, PageTitleFetcher.extract_title(html).length
  end

  # --- SSRF guard: these must all bail out before any request is attempted ---

  test "refuses loopback, private, and link-local addresses" do
    [
      "http://127.0.0.1/admin",
      "http://localhost:80/",
      "http://10.0.0.5/",
      "http://192.168.1.1/",
      "http://172.16.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://0.0.0.0/",
      "http://[::1]/"
    ].each do |url|
      assert_nil PageTitleFetcher.call(url), "expected #{url} to be refused"
    end
  end

  test "refuses ranges Ruby's IPAddr predicates don't cover" do
    [
      "http://100.64.0.1/",   # CGNAT
      "http://224.0.0.1/",    # multicast
      "http://192.0.0.1/",    # IETF protocol assignments
      "http://198.18.0.1/",   # benchmarking
      "http://240.0.0.1/"     # reserved
    ].each do |url|
      assert_nil PageTitleFetcher.call(url), "expected #{url} to be refused"
    end
  end

  test "refuses IPv4-mapped IPv6 forms of private addresses" do
    assert_nil PageTitleFetcher.call("http://[::ffff:127.0.0.1]/")
    assert_nil PageTitleFetcher.call("http://[::ffff:10.0.0.1]/")
    assert_nil PageTitleFetcher.call("http://[::ffff:169.254.169.254]/")
  end

  # The test above went green for the wrong reason: verify_safe! read uri.host,
  # which keeps the brackets on an IPv6 literal, so the address was never
  # parsed — the URL was refused only because "[::ffff:...]" failed to resolve.
  # These assert the address check itself, with no resolver in the path, and
  # cover the ipaddr 1.2.6 gap where the mapped loopback and link-local forms
  # both report as public.
  test "blocks IPv4-mapped IPv6 addresses at the address check itself" do
    fetcher = PageTitleFetcher.new("http://example.com")

    [
      "::ffff:127.0.0.1",       # loopback
      "::ffff:10.0.0.1",        # private
      "::ffff:192.168.1.1",     # private
      "::ffff:169.254.169.254", # cloud metadata
      "::1",                    # native loopback
      "169.254.169.254"         # native metadata
    ].each do |address|
      assert fetcher.send(:blocked?, IPAddr.new(address)),
             "expected #{address} to be blocked"
    end
  end

  test "still allows the IPv4-mapped form of a public address" do
    fetcher = PageTitleFetcher.new("http://example.com")

    assert_not fetcher.send(:blocked?, IPAddr.new("::ffff:8.8.8.8")),
               "expected the mapped form of a public address to be allowed"
  end

  test "parses an IPv6 literal host instead of sending it to the resolver" do
    fetcher = PageTitleFetcher.new("http://[::1]/")

    assert_equal [ IPAddr.new("::1") ], fetcher.send(:resolved_addresses, URI.parse("http://[::1]/").hostname)
  end

  test "refuses credentials embedded in the url" do
    assert_nil PageTitleFetcher.call("http://admin:secret@example.com/")
  end

  test "allows genuinely public addresses" do
    fetcher = PageTitleFetcher.new("http://example.com")
    [ "8.8.8.8", "1.1.1.1", "172.32.0.1", "93.184.216.34" ].each do |address|
      assert_not fetcher.send(:blocked?, IPAddr.new(address)),
                 "expected #{address} to be allowed"
    end
  end

  test "refuses non-http schemes and odd ports" do
    [
      "javascript:alert(1)",
      "file:///etc/passwd",
      "ftp://example.com/",
      "http://example.com:22/",
      "http://example.com:6379/"
    ].each do |url|
      assert_nil PageTitleFetcher.call(url), "expected #{url} to be refused"
    end
  end

  test "returns nil for blank and unparseable input" do
    assert_nil PageTitleFetcher.call(nil)
    assert_nil PageTitleFetcher.call("")
    assert_nil PageTitleFetcher.call("   ")
    assert_nil PageTitleFetcher.call("http://")
  end

  test "returns nil for a host that does not resolve" do
    assert_nil PageTitleFetcher.call("http://this-host-really-should-not-exist.invalid/")
  end
end
