# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# One-shot migration/seed tooling stays outside the application runtime image.
FROM dependencies AS tools
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
USER node
CMD ["npm", "run", "db:migrate"]

FROM dependencies AS build
COPY . .
ENV NEXT_OUTPUT_STANDALONE=1
RUN npm run build

FROM base AS app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
# PDF uses CSS tokens and locally bundled Geist TTF files at runtime.
COPY --from=build --chown=node:node /app/src/app/globals.css ./src/app/globals.css
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
