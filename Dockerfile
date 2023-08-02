FROM node:18

COPY . build-manager

WORKDIR build-manager

ENV FORCE_COLOR=2
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN yarn install --emoji --frozen-lockfile --no-progress && \
    yarn build

CMD ["yarn", "start"]
