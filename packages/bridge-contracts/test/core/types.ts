import { XChainTypes } from "../../typechain-types/contracts/BridgeDoorMultiToken";

export enum ChainRole {
    LOCKING = "locking",
    ISSUING = "issuing",
}

export type BridgeConfig = XChainTypes.BridgeConfigStruct;

export type BridgeConfigFactory = (safeAddress: string, tokenAddress?: string) => BridgeConfig;

export type Fixture = {
    witnessNumber: number;
    threshold: number;
    reward: number;
    minAccountCreateAmount: number;
    role: ChainRole;
    config: BridgeConfigFactory;
};
