FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY src ./src
COPY public ./public
COPY data ./data
ENV PORT=3000
EXPOSE 3000
USER node
CMD ["node", "server.mjs"]
