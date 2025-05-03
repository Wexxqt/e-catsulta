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
        protocol: "https",
        hostname: "www.gravatar.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "cloud.appwrite.io",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
        port: "",
        pathname: "/avatar/**",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // Add webpack optimization for chunk loading
  webpack: (config, { isServer }) => {
    // Optimize chunks to reduce timeout errors
    config.optimization.splitChunks = {
      chunks: "all",
      cacheGroups: {
        default: false,
        vendors: false,
        // Optimize large dependencies into separate chunks
        framework: {
          name: "framework",
          test: /[\\/]node_modules[\\/](react|react-dom|next|@next)[\\/]/,
          priority: 40,
          chunks: "all",
          enforce: true,
        },
        lib: {
          test: /[\\/]node_modules[\\/]/,
          priority: 30,
          minChunks: 1,
          reuseExistingChunk: true,
        },
      },
    };

    // Increase timeout for chunk loading
    if (!isServer) {
      config.optimization.chunkIds = "named";
      config.output.chunkLoadTimeout = 60000; // 60 seconds
    }

    return config;
  },
  // Increase serverless function timeout
  experimental: {
    serverComponentsExternalPackages: [],
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
