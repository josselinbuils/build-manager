FROM node:14

COPY . build-manager

WORKDIR build-manager

ENV FORCE_COLOR=2

RUN yarn install --production --frozen-lockfile && \
    yarn build

CMD ["yarn", "start"]
