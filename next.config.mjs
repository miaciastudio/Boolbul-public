import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [{ source: "/docs/webhooks", destination: "/docs/server", permanent: true }];
  },
};

export default nextConfig;

// Gives `next dev` access to Cloudflare bindings, matching the deployed Worker.
initOpenNextCloudflareForDev();
