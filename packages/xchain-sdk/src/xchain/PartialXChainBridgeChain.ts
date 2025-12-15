import { XChainAddress } from "./XChainAddress";
import { XChainBridgeIssue, XChainBridgeIssueFormat } from "./XChainBridgeIssue";
import { IXChainBridgeChain } from "./XChainBridgeChain";
import { ChainType } from "../common/types";

/**
 * PartialXChainBridgeChain includes only the fields that are necessary to merge XChainBridges.
 */
export class PartialXChainBridgeChain<T extends ChainType = ChainType> {
    type: T;
    doorAddress: XChainAddress<T>;
    issue: XChainBridgeIssue<T>;

    constructor(type: T, doorAddress: XChainAddress<T>, issue: XChainBridgeIssue<T>) {
        this.type = type;
        this.doorAddress = doorAddress;
        this.issue = issue;
    }

    /**
     * Creates a PartialXChainBridgeChain from an EVM XChainBridgeChain.
     * @param chainDoor The chain door.
     * @param chainIssue The chain issue.
     * @returns The PartialXChainBridgeChain.
     */
    static fromXrp(chainDoor: string, chainIssue: XChainBridgeIssueFormat<ChainType.XRP>): PartialXChainBridgeChain<ChainType.XRP> {
        return new PartialXChainBridgeChain(ChainType.XRP, XChainAddress.fromXrp(chainDoor), XChainBridgeIssue.fromXrp(chainIssue));
    }

    /**
     * Creates a PartialXChainBridgeChain from an EVM XChainBridgeChain.
     * @param chainDoor The chain door.
     * @param chainIssue The chain issue.
     * @returns The PartialXChainBridgeChain.
     */
    static fromEvm(chainDoor: string, chainIssue: XChainBridgeIssueFormat<ChainType.EVM>): PartialXChainBridgeChain<ChainType.EVM> {
        return new PartialXChainBridgeChain(ChainType.EVM, XChainAddress.fromEvm(chainDoor), XChainBridgeIssue.fromEvm(chainIssue));
    }

    /**
     * Creates a PartialXChainBridgeChain from an XChainBridgeChain with a given format.
     * @param format The format.
     * @param chainDoor The chain door.
     * @param chainIssue The chain issue.
     * @returns The PartialXChainBridgeChain.
     */
    static from<T extends ChainType>(format: T, chainDoor: string, chainIssue: XChainBridgeIssueFormat<T>): PartialXChainBridgeChain<T> {
        return new PartialXChainBridgeChain(format, XChainAddress.from(format, chainDoor), XChainBridgeIssue.from(format, chainIssue));
    }

    /**
     * Checks if the PartialXChainBridgeChain is equal to another.
     * @param other The other PartialXChainBridgeChain.
     * @returns If the PartialXChainBridgeChain is equal to the other.
     */
    equals(other: IXChainBridgeChain): boolean {
        return this.doorAddress.equals(other.doorAddress) && this.issue.equals(other.issue);
    }
}
