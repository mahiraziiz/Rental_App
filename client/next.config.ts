import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
      // If you use other image hosts, add them here
      // Example for Google user images:
      // {
      //   protocol: "https",
      //   hostname: "lh3.googleusercontent.com",
      //   port: "",
      //   pathname: "/**",
      // },
    ],
  },
};

export default nextConfig;