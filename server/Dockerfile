FROM node:18-alpine

# Create app directory inside the container
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the server code
COPY . .

# Create uploads directory for file storage
RUN mkdir -p uploads

# Expose the port the app listens on
EXPOSE 5000

CMD ["node", "server.js"]
