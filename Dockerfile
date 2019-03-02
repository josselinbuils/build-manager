FROM node:10
COPY . build-manager
WORKDIR build-manager
RUN yarn install --production --frozen-lockfile
CMD ["yarn", "start"]
