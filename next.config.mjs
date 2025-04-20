// filepath: c:\Users\Jomagran\Desktop\e-catsulta\healthcare\next.config.mjs
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.gravatar.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'cloud.appwrite.io',
        pathname: '**',
      },
    ],
  }
};

export default nextConfig;