/** Loopback, RFC1918, CGNAT/Tailscale, link-local and mDNS hosts cannot be reached from Cloudflare's edge. */
export function isUnreachableFromEdge(rawUrl: string): boolean {
  let host: string
  try {
    host = new URL(rawUrl).hostname.replace(/^\[|\]$/g, "").toLowerCase()
  } catch {
    return true
  }
  if (host === "localhost" || host.endsWith(".local") || host === "::1") return true
  const octets = host.split(".").map(Number)
  if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o))) return false
  const [a, b] = octets
  return (
    a === 127 ||
    a === 10 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254)
  )
}
