# xchain-sdk exmaple

This is a small example of how to use the xchain-sdk.

## Running the example

First of all, you need to build the `xchain-sdk` package:

```bash
cd ../
yarn
yarn build
```

Then, you can run the example:

```bash
cd example
yarn
yarn example
```

The example will ask for your EVM private keys or XRPL seeds depending on the networks you select. You can change the doors and providers in `example/src/doors.ts` and `exemple/src/providers.ts` respectively.
