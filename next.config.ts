import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["@prisma/client", "@react-pdf/renderer"],
  outputFileTracingIncludes: { "/api/finance/invoices/*/pdf": ["./public/fonts/**", "./src/app/globals.css"] },
};

export default createNextIntlPlugin()(config);
