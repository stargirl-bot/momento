require "net/http"
require "resolv"
require "ipaddr"

# Fetches a page and returns its title, or nil for anything that doesn't work
# out. Every failure mode is a nil — the caller (the bookmark dialog) just
# leaves the title field empty for the user to type into.
#
# This runs an HTTP request against a URL the user supplied, so the address is
# validated before every hop: scheme, port, and — critically — the resolved IPs,
# so the endpoint can't be used to probe the private network or a cloud
# metadata service.
class PageTitleFetcher
  MAX_REDIRECTS = 3
  MAX_BODY_BYTES = 512 * 1024
  MAX_TITLE_LENGTH = 255
  OPEN_TIMEOUT = 3
  READ_TIMEOUT = 5
  ALLOWED_PORTS = [ 80, 443 ].freeze
  USER_AGENT = "Momento/1.0 (+bookmark title fetcher)".freeze

  # IPAddr's loopback?/private?/link_local? cover 127/8, ::1, 10/8, 172.16/12,
  # 192.168/16, 169.254/16 (cloud metadata) and fe80::/10 — including their
  # IPv4-mapped IPv6 forms. These are the ranges it does not cover.
  BLOCKED_RANGES = %w[
    0.0.0.0/8
    100.64.0.0/10
    192.0.0.0/24
    192.0.2.0/24
    198.18.0.0/15
    198.51.100.0/24
    203.0.113.0/24
    224.0.0.0/4
    240.0.0.0/4
    ::/128
    fc00::/7
    100::/64
    2001:db8::/32
  ].map { |cidr| IPAddr.new(cidr) }.freeze

  class UnsafeUrl < StandardError; end

  def self.call(url)
    new(url).call
  end

  # Pure function, split out so the parsing half is testable without a network.
  def self.extract_title(html)
    return nil if html.blank?

    document = Nokogiri::HTML(html)
    candidate = document.at_css("title")&.text
    candidate = document.at_css('meta[property="og:title"]')&.[]("content") if candidate.blank?
    return nil if candidate.blank?

    candidate.squish.truncate(MAX_TITLE_LENGTH)
  end

  def initialize(url)
    @url = url.to_s.strip
  end

  def call
    return nil if @url.blank?

    self.class.extract_title(fetch_body)
  rescue UnsafeUrl, URI::InvalidURIError, Timeout::Error, SystemCallError, SocketError,
         Net::HTTPBadResponse, Net::HTTPHeaderSyntaxError, Net::ProtocolError, IOError,
         Resolv::ResolvError, OpenSSL::SSL::SSLError => error
    # Every failure is still a nil for the caller, but leave a trace: an empty
    # title field looks identical whether the page had no title, the host
    # refused us, or the local TLS trust store is missing a CA.
    Rails.logger.info("PageTitleFetcher gave up on #{@url}: #{error.class}: #{error.message}")
    nil
  end

  private
    def fetch_body
      uri = URI.parse(@url)
      remaining = MAX_REDIRECTS

      loop do
        address = verify_safe!(uri)
        response = request(uri, address)

        case response
        when Net::HTTPSuccess
          return read_body(response)
        when Net::HTTPRedirection
          return nil if remaining.zero? || response["location"].blank?

          remaining -= 1
          uri = URI.join(uri, response["location"])
        else
          return nil
        end
      end
    end

    def request(uri, address)
      http = Net::HTTP.new(uri.host, uri.port)
      # Connect to the address we already vetted while leaving Host, SNI, and
      # certificate verification bound to the original hostname. Without this
      # there is a window where DNS can be re-pointed at a private address
      # between our check and the connection.
      http.ipaddr = address.to_s
      http.use_ssl = uri.scheme == "https"
      http.open_timeout = OPEN_TIMEOUT
      http.read_timeout = READ_TIMEOUT

      http.start do |connection|
        connection.request(Net::HTTP::Get.new(uri, "User-Agent" => USER_AGENT, "Accept" => "text/html"))
      end
    end

    # Only read as much as a <head> could plausibly need, so a huge or endless
    # response can't exhaust memory.
    def read_body(response)
      body = response.body.to_s.byteslice(0, MAX_BODY_BYTES)
      body.force_encoding(charset_for(response)).encode("UTF-8", invalid: :replace, undef: :replace)
    end

    def charset_for(response)
      charset = response.type_params["charset"]
      Encoding.find(charset.presence || "UTF-8")
    rescue ArgumentError
      Encoding::UTF_8
    end

    # Re-run for the initial URL *and* every redirect target — a redirect to a
    # private address is the standard way around a first-hop-only check.
    # Returns the address to connect to.
    def verify_safe!(uri)
      raise UnsafeUrl unless uri.is_a?(URI::HTTP) && uri.host.present?
      raise UnsafeUrl unless ALLOWED_PORTS.include?(uri.port)
      raise UnsafeUrl if uri.userinfo.present?

      addresses = resolved_addresses(uri.host)
      # Every answer must be public: with a mixed record set, allowing the good
      # one would let a retry land on the bad one.
      raise UnsafeUrl if addresses.any? { |address| blocked?(address) }
      addresses.first
    end

    def resolved_addresses(host)
      # A bare IP in the URL never reaches a resolver, so handle it directly.
      return [ IPAddr.new(host) ] if ip_literal?(host)

      addresses = Resolv.getaddresses(host).filter_map do |address|
        IPAddr.new(address) rescue nil
      end
      raise UnsafeUrl if addresses.empty?
      addresses
    end

    def ip_literal?(host)
      IPAddr.new(host)
      true
    rescue IPAddr::Error
      false
    end

    def blocked?(address)
      return true if address.loopback? || address.private? || address.link_local?

      BLOCKED_RANGES.any? { |range| range.include?(address) }
    rescue IPAddr::Error
      true # unparseable or mismatched family — fail closed
    end
end
