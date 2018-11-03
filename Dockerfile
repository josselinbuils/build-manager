FROM node:8
COPY . build-manager
WORKDIR build-manager
RUN npm install
CMD ["npm", "start"]
