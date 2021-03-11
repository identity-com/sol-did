FROM node:15-alpine as builder

WORKDIR /usr/src/app

COPY . .

# install and build
RUN yarn install

# Bundle app source
RUN rm -rf node_modules
RUN yarn install --production

# Dirty hack to workaround the fact that oas-tools does not support adding middleware.
# See https://github.com/bug-hunters/oas3-tools/issues/19
RUN sed -i s/this.app.use\(cookieParser\(\)\)\;/this.app.use\(cookieParser\(\)\)\;this.app.use\(require\(\"cors\"\)\(\)\)\;/ node_modules/oas3-tools/dist/middleware/express.app.config.js

FROM node:15-alpine
WORKDIR /usr/src/app

EXPOSE 8080

COPY --from=builder /usr/src/app .

CMD [ "yarn", "app" ]
