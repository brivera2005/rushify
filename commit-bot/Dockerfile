FROM node:20-alpine

RUN apk add --no-cache git openssh-client tzdata

WORKDIR /bot

COPY package.json ./
COPY src ./src

# Default: repo mounted at /repo, state at /bot/data
ENV REPO_PATH=/repo
ENV STATE_DIR=/bot/data
ENV HINT_DIR=the-maze
ENV TZ=UTC
ENV COMMITS_MIN=5
ENV COMMITS_MAX=20
ENV TICK_MS=60000

CMD ["node", "src/index.mjs"]
