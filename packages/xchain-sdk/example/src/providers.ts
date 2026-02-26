import { providers } from "ethers";
import { EthersXChainProvider, XrplXChainProvider } from "xchain-sdk";
import { Client } from "xrpl";

export const MAINCHAIN_NODE_URL = "wss://s.devnet.rippletest.net:51233";
export const SIDECHAIN_NODE_URL = "http://168.119.63.112:8545";

export const MAINCHAIN_PROVIDER = new XrplXChainProvider(new Client(MAINCHAIN_NODE_URL));
export const SIDECHAIN_PROVIDER = new EthersXChainProvider(new providers.JsonRpcProvider(SIDECHAIN_NODE_URL));
