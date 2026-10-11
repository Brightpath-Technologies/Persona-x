import type { NextConfig } from "next";
import path from "path";

const webRoot = path.resolve(__dirname);
const personaXSrc = path.resolve(__dirname, "../../../src");

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Map @persona-x/* to the framework source
    config.resolve.alias = {
      ...config.resolve.alias,
      "@persona-x": personaXSrc,
    };

    // Handle .js import specifiers in the persona-x source (maps .js → .ts)
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };

    // Ensure modules imported by persona-x source resolve from our node_modules
    config.resolve.modules = [
      path.join(webRoot, "node_modules"),
      ...(config.resolve.modules ?? ["node_modules"]),
    ];

    return config;
  },
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
