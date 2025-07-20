FROM node:20-alpine
WORKDIR /app
COPY services/concat/package.json ./
COPY services/concat/tsconfig.json ./tsconfig.json
RUN npm install --production=false
COPY services/concat ./src
COPY common ./common
CMD ["npm","start"] 