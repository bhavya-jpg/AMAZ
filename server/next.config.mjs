/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // node:sqlite is a Node builtin; keep server code on the Node runtime.
  serverExternalPackages: [],
}

export default nextConfig
