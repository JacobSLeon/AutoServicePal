FROM node:20-slim

WORKDIR /app

# Install Postgres client + build tools
RUN apt-get update && apt-get install -y \
    bash \
    postgresql-client \
    build-essential

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
