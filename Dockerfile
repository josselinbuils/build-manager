FROM node:18

COPY . build-manager

WORKDIR build-manager

ENV FORCE_COLOR=2

RUN yarn install --emoji --frozen-lockfile --no-progress && \
    yarn build

CMD ["yarn", "start"]
