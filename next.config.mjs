/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/**/*": ["./data/**/*", "./knowledge/**/*"],
    },
  },
};

export default nextConfig;
