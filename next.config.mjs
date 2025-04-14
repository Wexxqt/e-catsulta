// filepath: c:\Users\Jomagran\Desktop\e-catsulta\healthcare\next.config.mjs
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: ['www.gravatar.com', 'cloud.appwrite.io'],
  }
};

export default nextConfig;