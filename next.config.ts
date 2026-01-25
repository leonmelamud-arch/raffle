import type { NextConfig } from 'next';

// Use standalone output for Docker, static export for GitHub Pages
const isDocker = process.env.DOCKER_BUILD === 'true';

const nextConfig: NextConfig = {
  // Use 'standalone' for Docker deployments, 'export' for static hosting
  output: isDocker ? 'standalone' : 'export',

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
