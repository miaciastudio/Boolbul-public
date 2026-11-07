import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      { source: "/docs/webhooks", destination: "/docs/server-adapters", permanent: true },
      { source: "/docs/server", destination: "/docs/server-adapters", permanent: true },
      { source: "/docs/mobile", destination: "/docs/mobile-apps", permanent: true },
      { source: "/docs/ftc-compliance", destination: "/compliance/ftc-click-to-cancel", permanent: true },
    ];
  },
};

export default nextConfig;

// Gives `next dev` access to Cloudflare bindings, matching the deployed Worker.
initOpenNextCloudflareForDev();
