# Backend Dockerfile
FROM node:20

WORKDIR /app

COPY package*.json ./

# Install dependencies (including nodemon)
RUN npm install && npm install -g nodemon

COPY . .

RUN npx prisma generate

EXPOSE 8080

# Run with nodemon
CMD ["nodemon", "src/index.js"]
