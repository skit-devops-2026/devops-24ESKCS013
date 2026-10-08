FROM nginx:alpine
RUN apk add --no-cache nodejs npm
WORKDIR /usr/share/nginx/html

# Copy package.json first to leverage Docker layer caching
COPY package*.json ./
RUN npm install

# Copy the rest of the application
COPY . .

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
