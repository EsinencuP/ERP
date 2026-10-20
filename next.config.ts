import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const config: NextConfig = {
  poweredByHeader: false,
  ...(process.env.NEXT_OUTPUT_STANDALONE === "1" ? { output: "standalone" as const } : {}),
  serverExternalPackages: ["@prisma/client", "@react-pdf/renderer"],
  outputFileTracingIncludes: { "/api/finance/invoices/*/pdf": ["./public/fonts/**", "./src/app/globals.css", "./node_modules/pdfkit/js/standard-fonts/**", "./node_modules/pdfkit/js/data/**"] },
};

export default createNextIntlPlugin()(config);
