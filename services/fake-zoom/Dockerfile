FROM node:20-alpine
WORKDIR /app
COPY services/fake-zoom/package.json ./
COPY services/fake-zoom/tsconfig.json ./tsconfig.json
RUN npm install --production=false
COPY services/fake-zoom ./src
COPY common ./common
CMD ["npm","start"] 