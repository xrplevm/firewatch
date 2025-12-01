import { EthersBridgeDoor, XrplBridgeDoor } from "xchain-sdk";
import { MAINCHAIN_PROVIDER, SIDECHAIN_PROVIDER } from "./providers.js";

export const MAINCHAIN_DOOR = new XrplBridgeDoor(MAINCHAIN_PROVIDER, "rELLgYp2TH3wg1isnSaDdzirAGo9781LXs", "XRPL Devnet");

export const SIDECHAIN_DOOR = new EthersBridgeDoor(
    SIDECHAIN_PROVIDER,
    "0xB5f762798A53d543a014CAf8b297CFF8F2F937e8",
    "EVM Sidechain Devnet",
);
