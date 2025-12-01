FROM node:18.16.1 as install
ARG NPM_TOKEN
ENV NPM_TOKEN ${NPM_TOKEN}

WORKDIR /app
COPY ["package.json", "yarn.lock", "./"]
RUN yarn

FROM install as build
COPY . .
RUN yarn hardhat compile
RUN yarn build

FROM build as test
RUN yarn lint
RUN yarn test

FROM test as analyze
RUN apt update
RUN apt install python3-pip -y
RUN pip3 install slither-analyzer==0.9.3 --break-system-packages
RUN slither /app --fail-medium
RUN touch /app/analyze.lock

FROM test as publish
COPY --from=analyze /app/analyze.lock .
RUN npm publish | true
