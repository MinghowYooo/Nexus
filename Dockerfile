# Multi-stage build for Vite React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Static file server
FROM nginx:1.27-alpine AS runner
# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html
# Copy nginx template
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
# Expose port for local runs; Cloud Run provides $PORT
EXPOSE 8080
# Use nginx with envsubst-enabled templates (nginx:alpine supports /etc/nginx/templates)
CMD ["nginx", "-g", "daemon off;"]



