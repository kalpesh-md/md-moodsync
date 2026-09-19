/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bcrypt", "pg", "aws-sdk"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
