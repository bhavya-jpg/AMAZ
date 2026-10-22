# DoorSignal server — single container (Next.js standalone + node:sqlite).
# Lives at the repository root so hosts that default to ./Dockerfile (e.g. Render) find it;
# it builds the app in server/.
FROM node:22-slim AS build
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY server/ ./
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 DATA_DIR=/data
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# Responses recorded from the real Ring Developer Playground, for replay mode.
COPY --from=build /app/fixtures ./fixtures
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 3000
CMD ["node", "server.js"]
