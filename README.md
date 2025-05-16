# E2E test suite

This repository contains the E2E test suite to ensure a proper behavior in the XRPL EVM Sidechain.

## Test modules

To test a module, first build the base docker image:

```bash
docker build -t base -f docker/base.Dockerfile .
```

Then, build the desired module docker image:

```bash
docker build -t <module> -f docker/<module>.Dockerfile .
```

When built, you can run the tests with the following command:

```bash
docker run -e TEST_ENV=<test-env> <module>
```

Where `<test-env>` can be one of the following:

- `mainnet`
- `testnet`
- `devnet`
