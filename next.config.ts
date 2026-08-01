import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La raíz no tiene página propia: todo vive bajo /[locale].
  async redirects() {
    return [{ source: "/", destination: "/es", permanent: false }];
  },
};

export default nextConfig;
