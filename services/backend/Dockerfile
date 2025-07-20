FROM node:20-alpine
WORKDIR /app
COPY services/backend/package.json ./
COPY services/backend/tsconfig.json ./tsconfig.json
RUN npm install --production=false
COPY services/backend ./src
COPY common ./common
EXPOSE 8080
CMD ["npm", "start"] 