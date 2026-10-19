import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "@react-pdf/renderer"],
  outputFileTracingIncludes: { "/api/finance/invoices/*/pdf": ["./public/fonts/**", "./src/app/globals.css"] },
};

export default config;
