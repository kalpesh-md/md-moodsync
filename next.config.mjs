/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["bcrypt", "pg", "aws-sdk", "express"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
