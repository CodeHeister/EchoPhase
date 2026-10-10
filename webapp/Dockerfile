FROM node:latest AS node-build
WORKDIR /src

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf.template /etc/nginx/templates/nginx.conf.template

# The stock entrypoint renders templates/*.template into this directory.
ENV NGINX_ENVSUBST_OUTPUT_DIR=/etc/nginx
# Only this variable is substituted; Kubernetes injects many others.
ENV NGINX_ENVSUBST_FILTER=^API_UPSTREAM$
ENV API_UPSTREAM=echophase:8080

COPY --from=node-build /src/dist /usr/share/nginx/html

EXPOSE 80

# CMD, not ENTRYPOINT: the image's entrypoint must run to render the template.
CMD ["nginx", "-g", "daemon off;"]
