/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Tauri — output as static files
  output: "export",
  // Disable image optimisation (not supported in static export)
  images: { unoptimized: true },
  // Tauri expects assets at root
  assetPrefix: process.env.NODE_ENV === "production" ? undefined : undefined,
};

export default nextConfig;
