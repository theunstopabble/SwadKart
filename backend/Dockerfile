FROM node:22-alpine

WORKDIR /app

# Install openssl for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./

RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate || true

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "npx prisma generate && npx prisma db push && npm run dev"]

