FROM node:22-alpine

RUN apk add --no-cache docker-cli

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN mkdir -p /exec-workspace /app/files

EXPOSE 3001

CMD ["npm", "run", "dev"]
