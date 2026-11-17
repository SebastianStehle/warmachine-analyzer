#
# API CLIENT (same as scripts/generate-client.mjs, keep the version in sync with frontend/openapitools.json)
#
FROM openapitools/openapi-generator-cli:v7.3.0 AS backend-client

COPY backend/openapi.yaml /spec/openapi.yaml
RUN docker-entrypoint.sh generate -g typescript-fetch --additional-properties=useSingleRequestParameter=false,ensureUniqueParams=false -i /spec/openapi.yaml -o /client

#
# BACKEND
#
FROM node:22-bookworm AS backend

WORKDIR /src/backend

# Copy the package json first to use the layer cache.
COPY backend/package*.json ./

RUN npm ci

COPY backend .

RUN npm run lint

RUN npm run build

# Fail the image build when tests fail.
RUN npm test

# Only keep production dependencies.
RUN npm ci --omit=dev && npm cache clean --force

#
# FRONTEND
#
FROM node:22-bookworm AS frontend

WORKDIR /src/frontend

# Copy the package json first to use the layer cache.
COPY frontend/package*.json ./

RUN npm ci

COPY frontend .

COPY scripts ../scripts
COPY --from=backend-client /client ./src/api/generated
RUN node ../scripts/add-ts-ignore.js ./src/api/generated && node gen-helper.mjs

RUN npm run lint

RUN npm run build

#
# RUNTIME
#
FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production

WORKDIR /app

COPY --from=backend /src/backend/node_modules ./node_modules
COPY --from=backend /src/backend/dist ./dist
COPY --from=frontend /src/frontend/dist ./assets

EXPOSE 3000

CMD [ "node", "dist/main.js" ]
