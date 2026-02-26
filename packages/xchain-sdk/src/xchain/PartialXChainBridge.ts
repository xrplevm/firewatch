import { XChainBridgeChain } from "./XChainBridgeChain";
import { PartialXChainBridgeChain } from "./PartialXChainBridgeChain";
import { IXChainBridge, XChainBridge, XChainBridgeFormat } from "./XChainBridge";
import { ChainType } from "../common/types";
import { capitalize } from "../common/utils/string";

/**
 * A partial XChainBridge that can be compared and merged with another partial XChainBridge to create a full XChainBridge.
 */
export class PartialXChainBridge<LT extends ChainType = ChainType, IT extends ChainType = ChainType> {
    lockingChain: XChainBridgeChain<LT> | PartialXChainBridgeChain<LT>;
    issuingChain: XChainBridgeChain<IT> | PartialXChainBridgeChain<IT>;

    constructor(
        lockingChain: XChainBridgeChain<LT> | PartialXChainBridgeChain<LT>,
        issuingChain: XChainBridgeChain<IT> | PartialXChainBridgeChain<IT>,
    ) {
        this.lockingChain = lockingChain;
        this.issuingChain = issuingChain;
    }

    /**
     * Creates a PartialXChainBridge from an EVM XCahinBridge.
     * @param doorAddress The door address.
     * @param xChainBridge The XChainBridge.
     * @param signatureReward The signature reward.
     * @param minAccountCreate The minimum account create.
     * @param chainId An optional chain id of the owner chain.
     * @returns The PartialXChainBridge.
     */
    static fromEvm(
        doorAddress: string,
        xChainBridge: XChainBridgeFormat<ChainType.EVM>,
        signatureReward: string,
        minAccountCreate?: string,
        chainId?: string,
    ): PartialXChainBridge<ChainType.EVM, ChainType.EVM> {
        const isLocking = xChainBridge.lockingChainDoor.toLowerCase() === doorAddress.toLowerCase();

        const lockingXChainBridgeChain = isLocking
            ? XChainBridgeChain.fromEvm(
                  xChainBridge.lockingChainDoor,
                  xChainBridge.lockingChainIssue,
                  signatureReward,
                  minAccountCreate,
                  chainId,
              )
            : PartialXChainBridgeChain.fromEvm(xChainBridge.lockingChainDoor, xChainBridge.lockingChainIssue);
        const issuingXChainBridgeChain = !isLocking
            ? XChainBridgeChain.fromEvm(
                  xChainBridge.issuingChainDoor,
                  xChainBridge.issuingChainIssue,
                  signatureReward,
                  minAccountCreate,
                  chainId,
              )
            : PartialXChainBridgeChain.fromEvm(xChainBridge.issuingChainDoor, xChainBridge.issuingChainIssue);

        return new PartialXChainBridge(lockingXChainBridgeChain, issuingXChainBridgeChain);
    }

    /**
     * Creates a PartialXChainBridge from an XRP XCahinBridge.
     * @param doorAddress The door address.
     * @param xChainBridge The XChainBridge.
     * @param signatureReward The signature reward.
     * @param minAccountCreate The minimum account create.
     * @param chainId An optional chain id of the owner chain.
     * @returns The PartialXChainBridge.
     */
    static fromXrp(
        doorAddress: string,
        xChainBridge: XChainBridgeFormat<ChainType.XRP>,
        signatureReward: string,
        minAccountCreate?: string,
        chainId?: string,
    ): PartialXChainBridge<ChainType.XRP, ChainType.XRP> {
        const isLocking = xChainBridge.LockingChainDoor === doorAddress;

        const lockingXChainBridgeChain = isLocking
            ? XChainBridgeChain.fromXrp(
                  xChainBridge.LockingChainDoor,
                  xChainBridge.LockingChainIssue,
                  signatureReward,
                  minAccountCreate,
                  chainId,
              )
            : PartialXChainBridgeChain.fromXrp(xChainBridge.LockingChainDoor, xChainBridge.LockingChainIssue);
        const issuingXChainBridgeChain = !isLocking
            ? XChainBridgeChain.fromXrp(
                  xChainBridge.IssuingChainDoor,
                  xChainBridge.IssuingChainIssue,
                  signatureReward,
                  minAccountCreate,
                  chainId,
              )
            : PartialXChainBridgeChain.fromXrp(xChainBridge.IssuingChainDoor, xChainBridge.IssuingChainIssue);

        return new PartialXChainBridge(lockingXChainBridgeChain, issuingXChainBridgeChain);
    }

    /**
     * Creates a PartialXChainBridge from an XChainBridge with the given format.
     * @param format The format.
     * @param doorAddress The door address.
     * @param xChainBridge The XChainBridge.
     * @param signatureReward The signature reward.
     * @param minAccountCreate The minimum account create.
     * @param chainId An optional chain id of the owner chain.
     * @returns The PartialXChainBridge.
     */
    static from<T extends ChainType>(
        format: T,
        doorAddress: string,

        xChainBridge: XChainBridgeFormat<T>,
        signatureReward: string,
        minAccountCreate?: string,
        chainId?: string,
    ): PartialXChainBridge<T, T> {
        return this[`from${capitalize(format)}`](
            doorAddress,
            xChainBridge as any, // It is safe to cast to any as the format is already checked in the params
            signatureReward,
            minAccountCreate,
            chainId,
        ) as PartialXChainBridge<T, T>;
    }

    /**
     * Checks if the PartialXChainBridge equals to another XChainBridge.
     * @param other The other XChainBridge.
     * @returns If the PartialXChainBridge equals to the other XChainBridge.
     */
    equals(other: IXChainBridge): boolean {
        return this.lockingChain.equals(other.lockingChain) && this.issuingChain.equals(other.issuingChain as XChainBridgeChain<ChainType>);
    }

    /**
     * Merges the PartialXChainBridge with another PartialXChainBridge to create a full XChainBridge.
     * @param other The other PartialXChainBridge.
     * @returns The full XChainBridge.
     */
    merge(other: PartialXChainBridge): XChainBridge {
        let lockingChain: XChainBridgeChain;
        if (this.lockingChain instanceof XChainBridgeChain) lockingChain = this.lockingChain;
        else if (other.lockingChain instanceof XChainBridgeChain) lockingChain = other.lockingChain;
        else throw new Error("One of the locking chains must be a full XChainBridgeChain");

        let issuingChain: XChainBridgeChain;
        if (this.issuingChain instanceof XChainBridgeChain) issuingChain = this.issuingChain;
        else if (other.issuingChain instanceof XChainBridgeChain) issuingChain = other.issuingChain;
        else throw new Error("One of the issuing chains must be a full XChainBridgeChain");

        return new XChainBridge(lockingChain, issuingChain);
    }
}
