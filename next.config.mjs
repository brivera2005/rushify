/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["fs", "path", "zlib", "util"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externalsPresets = { ...(config.externalsPresets ?? {}), node: true };
    }
    return config;
  },
};

export default nextConfig;
