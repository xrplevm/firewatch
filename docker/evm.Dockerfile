FROM base AS evm 

# Copy evm module
COPY modules/evm ./modules/evm

# Install dependencies
RUN cd modules/evm && \
    pnpm install && \
    pnpm lint

# Set entrypoint to run tests
ENTRYPOINT ["sh", "-c", "cd modules/evm && pnpm run test:${TEST_ENV}"]

