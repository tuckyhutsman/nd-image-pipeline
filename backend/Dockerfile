FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev imagemagick
COPY package*.json ./
RUN npm install --only=production
COPY src ./src
EXPOSE 3001
CMD ["npm", "start"]
