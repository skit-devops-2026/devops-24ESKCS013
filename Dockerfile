FROM nginx:alpine
RUN apk add --no-cache nodejs npm
COPY . /usr/share/nginx/html
WORKDIR /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
