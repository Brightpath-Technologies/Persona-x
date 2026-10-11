import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Persona YAML files are read from the filesystem at request time in server
  // routes; make sure they are traced into the serverless bundle.
  outputFileTracingIncludes: {
    "/api/**": ["./personas/**/*"],
    "/editions/**": ["./personas/**/*"],
  },
  // Type errors still fail the build; lint is run separately (npm run lint) so
  // stylistic rules don't block deploys.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
