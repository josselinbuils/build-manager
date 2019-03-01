FROM node:10
COPY . build-manager
WORKDIR build-manager
RUN yarn install --production && \
    yarn build-client
CMD ["yarn", "start-server"]
