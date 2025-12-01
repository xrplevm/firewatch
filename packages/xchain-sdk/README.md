<p align="center">
  <a href="https://docs.peersyst.com/xchain-sdk/getting-started/introduction" target="blank"><img src="https://peersyst-development.s3.eu-west-1.amazonaws.com/Logo+Circle.png" width="120" alt="Nest Logo" /></a>
</p>

<h1 align="center">
xchain-sdk
</h1>

<p align="center">
A JavaScript/TypeScript SDK for transferring assets across blockchains that support cross chain transactions.
</p>

<p align="center">
<a href="https://www.npmjs.com/package/xchain-sdk" target="_blank"><img src="https://img.shields.io/npm/v/xchain-sdk.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/package/xchain-sdk" target="_blank"><img src="https://img.shields.io/npm/l/xchain-sdk.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/package/xchain-sdk" target="_blank"><img src="https://img.shields.io/npm/dm/xchain-sdk.svg" alt="NPM Downloads" /></a>
<a href="https://discord.gg/g2sUG2dr" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
</p>

<!--
<a target="_blank"><img src=https://img.shields.io/github/actions/workflow/status/Peersyst/evm-sidechain-bridge/release.yml alt="Github Actions" /></a>
-->

## Description

The xchain-sdk is a JavaScript/TypeScript development kit for transferring assets across blockchains that support cross chain transactions.

The main goal of the xchain-sdk is to provide a layer of abstraction on top of the complexity introduced by cross chain transactions. This allows developers to create cross chain transfers with a few lines of code. Nonetheless, using custom implementations or extending the functionalities is also possible. In other words, this set of cross chain tools is aimed at both developers with simple use cases as well as more advanced ones that require more customisation.

## Getting started

To get started, checkout the documentation at [https://docs.peersyst.com/xchain-sdk](https://docs.peersyst.com/xchain-sdk).

## Installation

The package can be installed with your preferred package manager.

```shell
# With npm
npm i xchain-sdk
# With yarn
yarn add xchain-sdk
```

## Basic usage

```typescript
import {
    XrplXChainProvider,
    EthersXChainProvider,
    XrplBridgeDoor,
    EthersBridgeDoor,
    BridgeManager,
    BridgeDirection,
    XrplXChainSigner,
    EthersXChainSigner,
    XrplXChainWallet,
    EthersXChainWallet,
} from "xchain-sdk";
import { Client as XrplClient, Wallet as XrplWallet } from "xrpl";
import { Wallet as EthersWallet, providers as EthersProviders } from "ethers";

// Create providers
const xrplMainnetProvider = new XrplXChainProvider(new XrplClient("wss://xrplcluster.com"));
const xrplEvmSidechainProvider = new EthersXChainProvider(new EthersProviders.JsonRpcProvider("https://rpc-evm-sidechain.xrpl.org"));

// Create bridge doors
const xrplMainnetBridgeDoor = new XrplBridgeDoor(xrplMainnetProvider, "rELLgYp2TH3wg1isnSaDdzirAGo9781LXs", "XRPL Mainnet");
const xrplEvmSidechainBridgeDoor = new EthersBridgeDoor(
    xrplEvmSidechainProvider,
    "0xB5f762798A53d543a014CAf8b297CFF8F2F937e8",
    "XRPL EVM Sidechain",
);

// Create bridge manager
const bridgeManager = await BridgeManager.createAsync(xrplMainnetBridgeDoor, xrplEvmSidechainBridgeDoor);

// Get bridge
const bridge = await bridgeManager.getBridge(BridgeDirection.LOCKING_TO_ISSUING, "XRP");

// Create wallets
const xrplMainnetWallet = new XrplXChainWallet(
    xrplMainnetProvider,
    new XrplXChainSigner(XrplWallet.fromSeed("aSeed"), xrplMainnetProvider),
);
const xrplEvmSidechainWallet = new EthersXChainWallet(
    xrplEvmSidechainProvider,
    new EthersXChainSigner(new EthersWallet("aPrivateKey", xrplEvmSidechainProvider.ethersProvider)),
);

// Transfer
const result = await bridgeManager.transfer(bridge, xrplMainnetWallet, xrplEvmSidechainWallet, "100");
```

For a more detailed example, check out the guides in the [documentation](https://docs.peersyst.com/xchain-sdk).

## Questions

For questions and support please use the official [Discord](https://discord.gg/g2sUG2dr) channel.
