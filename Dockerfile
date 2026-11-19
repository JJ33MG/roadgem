# One service for the preview: builds the website and the API, the API serves both.
FROM node:20-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY frontend/package*.json frontend/
RUN cd frontend && npm ci
COPY backend/package*.json backend/
COPY backend/prisma backend/prisma
RUN cd backend && npm ci
COPY frontend frontend
COPY backend backend
# Same origin: the browser calls /api on the address it came from.
ENV VITE_API_BASE_URL=/api VITE_BACKEND_URL=
RUN cd frontend && npm run build
RUN cd backend && npm run build && rm -rf public && cp -r ../frontend/dist public

FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app/backend
COPY --from=build /app/backend ./
ENV NODE_ENV=production SERVE_FRONTEND=true
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/server.js"]
