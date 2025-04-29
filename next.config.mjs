// filepath: c:\Users\Jomagran\Desktop\e-catsulta\healthcare\next.config.mjs
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.gravatar.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "cloud.appwrite.io",
        pathname: "**",
      },
    ],
  },
};

export default nextConfig;
