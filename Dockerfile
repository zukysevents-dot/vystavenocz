# Build SPA → servíruj přes nginx (statika + reverse-proxy /api na backend = same-origin, bez CORS).
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Same-origin deploy: API je za stejným originem na /api (nginx proxy) → relativní base URL.
# Build-time ENV přebíjí .env.production (Vite čte VITE_* z prostředí s nejvyšší prioritou).
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
