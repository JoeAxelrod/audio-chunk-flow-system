FROM node:20-alpine
WORKDIR /app
COPY services/frontend/package.json ./
COPY services/frontend/tsconfig.json ./
COPY services/frontend/vite.config.ts ./
RUN npm install --production=false
COPY services/frontend ./
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 