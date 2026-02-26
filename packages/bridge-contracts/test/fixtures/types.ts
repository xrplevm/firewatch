import { XChainTypes } from "../../typechain-types/contracts/BridgeDoor";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { GnosisSafeL2Mock, BridgeDoor, BridgeToken } from "../../typechain-types";

export type CreateBridgeFixture = {
    params: {
        replaceSafeAddress?: string;
        config: (safe: string, token: string) => XChainTypes.BridgeConfigStruct;
        params: {
            minCreateAmount: number;
            signatureReward: number;
        };
    };
    error?: string;
};

export type CreateBridgeResult = DeployBridgeDoorResult &
    DeployBridgeTokenResult & {
        config: XChainTypes.BridgeConfigStruct;
        params: {
            minCreateAmount: number;
            signatureReward: number;
        };
    };

export type DeploySafeFixture = {
    params: {
        witnessNumber: number;
        threshold: number;
        address?: string;
    };
};

export type DeploySafeResult = {
    witnesses: SignerWithAddress[];
    users: SignerWithAddress[];
    safe: GnosisSafeL2Mock;
    threshold: number;
};

export type DeployBridgeDoorFixture = {
    params: {
        replaceSafeAddress?: string;
    };
};

export type DeployBridgeDoorResult = DeploySafeResult & {
    bridgeDoor: BridgeDoor;
    doorSafeAddress: string;
};

export type DeployBridgeTokenFixture = {
    params: {
        tokenName: string;
        tokenCode: string;
    };
};

export type DeployBridgeTokenResult = {
    bridgeToken: BridgeToken;
};
