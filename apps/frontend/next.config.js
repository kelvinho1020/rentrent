/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["mapbox-gl", "@rentrent/shared"],
}

module.exports = nextConfig 