import { IXChainBridgeChain, XChainBridgeChain } from "./XChainBridgeChain";
import { XChainBridge as XRPLXChainBridge } from "xrpl";
import { XChainTypes } from "@peersyst/xrp-evm-contracts/dist/typechain-types/contracts/BridgeDoorMultiToken";
import { ChainType } from "../common";
import { capitalize } from "../common/utils/string";

export type XChainBridgeFormats = {
    xrp: XRPLXChainBridge;
    evm: XChainTypes.BridgeConfigStruct;
};

export interface IXChainBridge {
    lockingChain: IXChainBridgeChain;
    issuingChain: IXChainBridgeChain;
}

export type XChainBridgeFormat<T extends ChainType> = XChainBridgeFormats[T];

/**
 * XChainBridge.
 */
export class XChainBridge<LT extends ChainType = ChainType, IT extends ChainType = ChainType> {
    /**
     * The locking chain.
     */
    lockingChain: XChainBridgeChain<LT>;
    /**
     * The issuing chain.
     */
    issuingChain: XChainBridgeChain<IT>;

    constructor(lockingChain: XChainBridgeChain<LT>, issuingChain: XChainBridgeChain<IT>) {
        this.lockingChain = lockingChain;
        this.issuingChain = issuingChain;
    }

    /**
     * Formats an XChainBridge to an XRP XChainBridge.
     * @returns The XRP XChainBridge.
     */
    forXrp(): XChainBridgeFormat<ChainType.XRP> {
        const lockingChainForXrp = this.lockingChain.forXrp();
        const issuingChainForXrp = this.issuingChain.forXrp();

        return {
            LockingChainDoor: lockingChainForXrp.doorAddress,
            LockingChainIssue: lockingChainForXrp.issue,
            IssuingChainDoor: issuingChainForXrp.doorAddress,
            IssuingChainIssue: issuingChainForXrp.issue,
        };
    }

    /**
     * Formats an XChainBridge to an EVM XChainBridge.
     * @returns The EVM XChainBridge.
     */
    forEvm(): XChainBridgeFormat<ChainType.EVM> {
        const lockingChainForEvm = this.lockingChain.forEvm();
        const issuingChainForEvm = this.issuingChain.forEvm();

        return {
            lockingChainDoor: lockingChainForEvm.doorAddress,
            lockingChainIssue: lockingChainForEvm.issue,
            issuingChainDoor: issuingChainForEvm.doorAddress,
            issuingChainIssue: issuingChainForEvm.issue,
        };
    }

    /**
     * Formats an XChainBridge to an XChainBridge with a given format.
     * @returns The XChainBridge.
     */
    for(format: ChainType): XChainBridgeFormat<ChainType> {
        return this[`for${capitalize(format)}`]();
    }

    /**
     * Formats an XChainBridge to the format of the locking chain.
     * @returns The locking chain XChainBridge.
     */
    forLocking(): XChainBridgeFormat<LT> {
        return this.for(this.lockingChain.type) as XChainBridgeFormat<LT>;
    }

    /**
     * Formats an XChainBridge to the format of the issuing chain.
     * @returns The issuing chain XChainBridge.
     */
    forIssuing(): XChainBridgeFormat<IT> {
        return this.for(this.issuingChain.type) as XChainBridgeFormat<IT>;
    }

    /**
     * Checks if the XChainBridge is equal to another.
     * @param other The other XChainBridge.
     * @returns If the XChainBridge is equal to the other.
     */
    equals(other: IXChainBridge): boolean {
        return this.lockingChain.equals(other.lockingChain) && this.issuingChain.equals(other.issuingChain);
    }
}
