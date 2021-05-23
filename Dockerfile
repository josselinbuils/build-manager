FROM node:14

COPY . build-manager

WORKDIR build-manager

ENV FORCE_COLOR=2

RUN yarn install --emoji --frozen-lockfile --no-progress && \
    NODE_ENV=production yarn build

CMD ["yarn", "start"]
