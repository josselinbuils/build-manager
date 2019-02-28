FROM node:8
COPY . build-manager
WORKDIR build-manager
RUN yarn install --production
CMD ["yarn", "start"]
