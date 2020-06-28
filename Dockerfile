ARG NODE_VERSION=12.18.1

FROM node:$NODE_VERSION-alpine AS build

WORKDIR /build
COPY package*.json ./
RUN npm set progress=false && npm config set depth 0
RUN npm install --only=production

FROM node:$NODE_VERSION-alpine
WORKDIR /app

COPY ./src /app/src
COPY --from=build /build/package*.json /app/
COPY --from=build /build/node_modules /app/node_modules

CMD ["npm", "run", "start"]
