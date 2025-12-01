import { ChainType } from "../common/types";
import { capitalize } from "../common/utils/string";
import { IXChainAddress, XChainAddress } from "./XChainAddress";
import { IXChainBridgeIssue, XChainBridgeIssue, XChainBridgeIssueFormat } from "./XChainBridgeIssue";

export type XChainBridgeChainFormat<T extends ChainType> = {
    doorAddress: string;
    issue: XChainBridgeIssueFormat<T>;
    signatureReward: string;
    minAccountCreate?: string;
};

export interface IXChainBridgeChain {
    doorAddress: IXChainAddress;
    issue: IXChainBridgeIssue;
}

/**
 * XChainBridgeChain.
 */
export class XChainBridgeChain<T extends ChainType = ChainType> {
    /**
     * The chain type.
     */
    type: T;
    /**
     * The chain door address.
     */
    doorAddress: XChainAddress<T>;
    /**
     * The chain issue.
     */
    issue: XChainBridgeIssue<T>;
    /**
     * The signature reward without decimals.
     */
    signatureReward: string;
    /**
     * The minimum account create amount without decimals.
     */
    minAccountCreate?: string;
    /**
     * Optional id to identify the chain.
     */
    id?: string;

    constructor(
        type: T,
        doorAddress: XChainAddress<T>,
        issue: XChainBridgeIssue<T>,
        signatureReward: string,
        minAccountCreate?: string,
        id?: string,
    ) {
        this.type = type;
        this.doorAddress = doorAddress;
        this.issue = issue;
        this.signatureReward = signatureReward;
        this.minAccountCreate = minAccountCreate;
        this.id = id;
    }

    /**
     * Creates an XChainBridgeChain from an XRP XChainBridgeChain.
     * @param chainDoor The chain door.
     * @param chainIssue The chain issue.
     * @param signatureReward The signature reward.
     * @param minAccountCreate The minimum account create.
     * @param id An optional chain id.
     * @returns The XChainBridgeChain.
     */
    static fromXrp(
        chainDoor: string,
        chainIssue: XChainBridgeIssueFormat<ChainType.XRP>,
        signatureReward: string,
        minAccountCreate?: string,
        id?: string,
    ): XChainBridgeChain<ChainType.XRP> {
        return new XChainBridgeChain(
            ChainType.XRP,
            XChainAddress.fromXrp(chainDoor),
            XChainBridgeIssue.fromXrp(chainIssue),
            signatureReward,
            minAccountCreate,
            id,
        );
    }

    /**
     * Creates an XChainBridgeChain from an EVM XChainBridgeChain.
     * @param chainDoor The chain door.
     * @param chainIssue The chain issue.
     * @param signatureReward The signature reward.
     * @param minAccountCreate The minimum account create.
     * @param id An optional chain id.
     * @returns The XChainBridgeChain.
     */
    static fromEvm(
        chainDoor: string,
        chainIssue: XChainBridgeIssueFormat<ChainType.EVM>,
        signatureReward: string,
        minAccountCreate?: string,
        id?: string,
    ): XChainBridgeChain<ChainType.EVM> {
        return new XChainBridgeChain(
            ChainType.EVM,
            XChainAddress.fromEvm(chainDoor),
            XChainBridgeIssue.fromEvm(chainIssue),
            signatureReward,
            minAccountCreate,
            id,
        );
    }

    /**
     * Creates an XChainBridgeChain from an XChainBridgeChain with a given format.
     * @param format The format.
     * @param chainDoor The chain door.
     * @param chainIssue The chain issue.
     * @param signatureReward The signature reward.
     * @param minAccountCreate The minimum account create.
     * @param id An optional chain id.
     * @returns The XChainBridgeChain.
     */
    static from<T extends ChainType>(
        format: T,
        chainDoor: string,
        chainIssue: XChainBridgeIssueFormat<T>,
        signatureReward: string,
        minAccountCreate?: string,
        id?: string,
    ): XChainBridgeChain<T> {
        return new XChainBridgeChain(
            format,
            XChainAddress.from(format, chainDoor),
            XChainBridgeIssue.from(format, chainIssue),
            signatureReward,
            minAccountCreate,
            id,
        );
    }

    /**
     * Formats an XChainBridgeChain to an XRP XChainBridgeChain.
     * @param chain The chain id.
     * @param xChainBridge The XChainBridge.
     * @param signatureReward The signature reward.
     * @param minAccountCreate The minimum account create.
     * @returns The XRP XChainBridgeChain.
     */
    forXrp(): XChainBridgeChainFormat<ChainType.XRP> {
        return {
            doorAddress: this.doorAddress.forXrp(),
            issue: this.issue.forXrp(),
            signatureReward: this.signatureReward,
            minAccountCreate: this.minAccountCreate,
        };
    }

    /**
     * Formats an XChainBridgeChain to an EVM XChainBridgeChain.
     * @param chain The chain id.
     * @param xChainBridge The XChainBridge.
     * @param signatureReward The signature reward.
     * @param minAccountCreate The minimum account create.
     * @returns The EVM XChainBridgeChain.
     */
    forEvm(): XChainBridgeChainFormat<ChainType.EVM> {
        return {
            doorAddress: this.doorAddress.forEvm(),
            issue: this.issue.forEvm(),
            signatureReward: this.signatureReward,
            minAccountCreate: this.minAccountCreate,
        };
    }

    /**
     * Formats an XChainBridgeChain to an XChainBridgeChain with a given format.
     * @param format The format.
     * @param chain The chain id.
     * @param xChainBridge The XChainBridge.
     * @param signatureReward The signature reward.
     * @param minAccountCreate The minimum account create.
     * @returns The XChainBridgeChain.
     */
    for<T extends ChainType>(format: T): XChainBridgeChainFormat<T> {
        return this[`for${capitalize(format)}`]() as XChainBridgeChainFormat<T>;
    }

    /**
     * Checks if the XChainBridgeChain is equal to another.
     * @param other The other XChainBridgeChain.
     * @returns If the XChainBridgeChain is equal to the other.
     */
    equals(other: IXChainBridgeChain): boolean {
        return this.doorAddress.equals(other.doorAddress) && this.issue.equals(other.issue);
    }
}
