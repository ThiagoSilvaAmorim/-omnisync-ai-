FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npx prisma generate

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && if [ \"$NODE_ENV\" != \"production\" ]; then node prisma/seed.js; fi && node src/index.js"]
