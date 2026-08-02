import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages rely on native bindings / filesystem access and must be
  // required at runtime on the server rather than bundled.
  serverExternalPackages: ["@prisma/client", ".prisma/client", "@napi-rs/canvas"],
};

export default nextConfig;
