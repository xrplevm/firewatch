FROM node:18-alpine

WORKDIR /app

# Install git for dependencies
RUN apk add --no-cache git

# Install pnpm
RUN npm install -g pnpm@9.7.0

# Copy package files
COPY package*.json ./
COPY modules/cosmos/package*.json ./modules/cosmos/

# Install dependencies
RUN pnpm install

# Copy source files
COPY . .

# Run linting
RUN cd modules/cosmos && pnpm run lint
