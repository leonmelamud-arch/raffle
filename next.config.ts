import type { NextConfig } from 'next';

// Use standalone output for Docker, static export for GitHub Pages
const isDocker = process.env.DOCKER_BUILD === 'true';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker production builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Environment variables available at build time
  env: {
    NEXT_PUBLIC_POSTGREST_URL: process.env.NEXT_PUBLIC_POSTGREST_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  // Disable image optimization for simpler deployment
  images: {
    unoptimized: true,
  },

  // Enable strict mode for better development experience
  reactStrictMode: true,
};

export default nextConfig;
