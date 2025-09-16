# Multi-stage build for Vite React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Static file server
FROM nginx:1.27-alpine AS runner
# Install envsubst for template processing
RUN apk add --no-cache gettext
# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html
# Copy nginx template and startup script
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY nginx/start.sh /start.sh
RUN chmod +x /start.sh
# Expose port for local runs; Cloud Run provides $PORT
EXPOSE 8080
# Use custom startup script
CMD ["/start.sh"]



