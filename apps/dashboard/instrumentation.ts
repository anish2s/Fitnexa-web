/**
 * Runs once when the server starts. Flags a deployment setting that silently weakens rate limits:
 * in production this server should sit behind Cloudflare / a load balancer and know it
 * (TRUSTED_PROXY_HOPS ≥ 1); with 0, a visitor could put any IP in X-Forwarded-For. See docs/DEPLOYMENT.md.
 */
export function register() {
  if (process.env.NODE_ENV === 'production' && !process.env.TRUSTED_PROXY_HOPS) {
    console.warn(
      '[fitnexa] TRUSTED_PROXY_HOPS is not set: visitor IPs are taken from the connection. In production set it to the number ' +
        'of proxies in front of this server (Cloudflare = 1) and keep the server reachable only through them.',
    );
  }
}
