FROM node:15-alpine as builder

WORKDIR /usr/src/app

COPY . .

# install and build
RUN yarn install

# Bundle app source
RUN rm -rf node_modules
RUN yarn install --production

FROM node:15-alpine
WORKDIR /usr/src/app

EXPOSE 8080

COPY --from=builder /usr/src/app .

CMD [ "yarn", "app" ]
