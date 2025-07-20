FROM node:20-alpine
WORKDIR /app
COPY services/transcriber/package.json ./
COPY services/transcriber/tsconfig.json ./tsconfig.json
RUN npm install --production=false
COPY services/transcriber ./src
COPY common ./common
CMD ["npm","start"] 