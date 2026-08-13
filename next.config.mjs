/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Clickjacking: sin iframes legítimos en SIH
          { key: "X-Frame-Options", value: "DENY" },
          // Evita MIME-sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No filtra el referrer fuera del origin
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Sin APIs sensibles del browser
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), sync-xhr=()",
          },
          // CSP en modo report-only: no bloquea, documenta violaciones para
          // endurecer en una pasada futura sin romper Next/inline styles.
          {
            key: "Content-Security-Policy-Report-Only",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
              "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
              "font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; " +
              "base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

// HSTS (Strict-Transport-Security) no habilitado: el deploy actual se sirve por
// HTTP local (next start). Habilitarlo con max-age alto rompería el acceso si
// no hay HTTPS estable. Al migrar a Vercel/HTTPS: agregar
// { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }

export default nextConfig;