FROM base AS cosmos 

# Copy cosmos module
COPY modules/cosmos ./modules/cosmos

# Install dependencies
RUN cd modules/cosmos && \
    pnpm install && \
    pnpm lint

# Set entrypoint to run tests
ENTRYPOINT ["sh", "-c", "cd modules/cosmos && pnpm run test:${TEST_ENV}"]

