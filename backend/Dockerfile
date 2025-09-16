FROM node:20-alpine

WORKDIR /app

# Install deps first
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY . .

# Expose Cloud Run port
ENV PORT=3001
EXPOSE 3001

# Start server
CMD ["npm", "start"]



