import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDir = process.env.NEXT_DIST_DIR || ".next";
const apiProxyTarget = process.env.API_PROXY_TARGET?.trim()?.replace(/\/+$/, "") ?? "";

function buildConnectSources() {
  const connectSources = new Set(["'self'"]);
  const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

  if (publicApiBaseUrl) {
    try {
      connectSources.add(new URL(publicApiBaseUrl).origin);
    } catch (error) {
      // Ignore malformed optional public URLs and keep the default safe policy.
    }
  }

  if (process.env.NODE_ENV !== "production") {
    [
      "http://localhost:4000",
      "http://127.0.0.1:4000",
      "http://localhost:4100",
      "http://127.0.0.1:4100",
      "ws://localhost:3000",
      "ws://127.0.0.1:3000",
      "ws://localhost:3100",
      "ws://127.0.0.1:3100"
    ].forEach((source) => connectSources.add(source));
  }

  return Array.from(connectSources);
}

function buildContentSecurityPolicy() {
  const scriptSources = ["'self'", "'unsafe-inline'"];

  if (process.env.NODE_ENV !== "production") {
    scriptSources.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${buildConnectSources().join(" ")}`,
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "manifest-src 'self'",
    "worker-src 'self' blob:"
  ].join("; ");
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: buildContentSecurityPolicy()
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), usb=()"
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin"
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-site"
  },
  {
    key: "Origin-Agent-Cluster",
    value: "?1"
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "off"
  },
  {
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none"
  }
];

if (process.env.NODE_ENV === "production") {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir,
  output: "standalone",
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  outputFileTracingRoot: path.join(currentDirectory, ".."),
  async rewrites() {
    if (!apiProxyTarget) {
      return [];
    }

    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${apiProxyTarget}/api/:path*`
        }
      ],
      afterFiles: [],
      fallback: []
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
