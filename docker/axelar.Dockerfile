FROM base AS axelar 

# Copy axelar module
COPY modules/axelar ./modules/axelar

# Install dependencies
RUN cd modules/axelar && \
    pnpm install && \
    pnpm lint

# Set entrypoint to run tests
ENTRYPOINT ["sh", "-c", "cd modules/axelar && pnpm run test:${TEST_ENV}"]