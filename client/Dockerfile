# Stage 1: build the static site. Vite bakes VITE_* values in at build time.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_B_URL=/api
ARG VITE_SHOW_DEMO_ACCOUNTS=true
ENV VITE_B_URL=$VITE_B_URL VITE_SHOW_DEMO_ACCOUNTS=$VITE_SHOW_DEMO_ACCOUNTS
RUN npm run build

# Stage 2: serve it with nginx, which also proxies /api to the API container (same origin, so no CORS needed).
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
