import { Currency, IssuedCurrency } from "xrpl";
import { XChainTypes } from "@peersyst/xrp-evm-contracts/dist/typechain-types/contracts/BridgeDoorMultiToken";
import { constants } from "ethers";
import { IXChainAddress, XChainAddress } from "./XChainAddress";
import { ChainType } from "../common/types";
import { convertCurrencyCode, parseCurrencyCode } from "../common/utils/xrpl";
import { capitalize } from "../common/utils/string";

export type XChainBridgeIssueFormats = {
    xrp: Currency;
    evm: XChainTypes.BridgeChainIssueStruct;
};

export type XChainBridgeIssueFormat<T extends ChainType> = XChainBridgeIssueFormats[T];

export interface IXChainBridgeIssue {
    currency: string;
    issuer?: IXChainAddress;
}

/**
 * XChainBridgeIssue.
 */
export class XChainBridgeIssue<T extends ChainType> {
    /**
     * The currency.
     */
    currency: string;
    /**
     * The issuer.
     */
    issuer?: XChainAddress<T>;

    constructor(currency: string, issuer?: XChainAddress<T>) {
        this.currency = currency;
        this.issuer = issuer;
    }

    /**
     * Creates an XChainBridgeIssue from an XRP XChainBridgeIssue.
     * @param xrpBridgeIssue The XRP XChainBridgeIssue.
     * @returns The XChainBridgeIssue.
     */
    static fromXrp(xrpBridgeIssue: XChainBridgeIssueFormat<ChainType.XRP>): XChainBridgeIssue<ChainType.XRP> {
        if (xrpBridgeIssue.currency === ChainType.XRP) return new XChainBridgeIssue(ChainType.XRP);
        else
            return new XChainBridgeIssue(
                parseCurrencyCode(xrpBridgeIssue.currency),
                (xrpBridgeIssue as IssuedCurrency).issuer ? XChainAddress.fromXrp((xrpBridgeIssue as IssuedCurrency).issuer) : undefined,
            );
    }

    /**
     * Creates an XChainBridgeIssue from an EVM XChainBridgeIssue.
     * @param evmBridgeIssue The EVM XChainBridgeIssue.
     * @returns The XChainBridgeIssue.
     */
    static fromEvm(evmBridgeIssue: XChainBridgeIssueFormat<ChainType.EVM>): XChainBridgeIssue<ChainType.EVM> {
        return new XChainBridgeIssue(
            evmBridgeIssue.currency,
            evmBridgeIssue.issuer === constants.AddressZero ? undefined : XChainAddress.fromEvm(evmBridgeIssue.issuer),
        );
    }

    /**
     * Creates an XChainBridgeIssue from an XChainBridgeIssue with a given format.
     * @param format The format.
     * @param bridgeIssue The XChainBridgeIssue.
     * @returns The XChainBridgeIssue.
     */
    static from<T extends ChainType>(format: T, bridgeIssue: XChainBridgeIssueFormat<T>): XChainBridgeIssue<T> {
        let issue;

        if (format === ChainType.XRP) issue = this.fromXrp(bridgeIssue as XChainBridgeIssueFormat<ChainType.XRP>);
        else if (format === ChainType.EVM) issue = this.fromEvm(bridgeIssue as XChainBridgeIssueFormat<ChainType.EVM>);
        else throw new Error(`Unsupported format: ${format}`);

        return issue as XChainBridgeIssue<T>;
    }

    /**
     * Formats the XChainBridgeIssue to an XRP XChainBridgeIssue.
     * @returns The XRP XChainBridgeIssue.
     */
    forXrp(): XChainBridgeIssueFormat<ChainType.XRP> {
        if (this.currency === "XRP") {
            return {
                currency: "XRP",
            };
        } else {
            if (!this.issuer) throw new Error("Issuer is required for non-XRP currencies");

            return {
                currency: convertCurrencyCode(this.currency),
                issuer: this.issuer.forXrp(),
            };
        }
    }

    /**
     * Formats the XChainBridgeIssue to an EVM XChainBridgeIssue.
     * @returns The EVM XChainBridgeIssue.
     */
    forEvm(): XChainBridgeIssueFormat<ChainType.EVM> {
        return {
            currency: this.currency,
            issuer: this.issuer?.forEvm() || constants.AddressZero,
        };
    }

    /**
     * Formats the XChainBridgeIssue to an XChainBridgeIssue with a given format.
     * @param format The format.
     * @returns The XChainBridgeIssue.
     */
    for<T extends ChainType>(format: T): XChainBridgeIssueFormat<T> {
        return this[`for${capitalize(format)}`]() as XChainBridgeIssueFormat<T>;
    }

    /**
     * Checks if the XChainBridgeIssue is native.
     * Returns true for the native token. Otherwise, returns false.
     * @returns If the XChainBridgeIssue is native.
     */
    isNative(): boolean {
        return !this.issuer;
    }

    /**
     * Checks if the XChainBridgeIssue is equal to another.
     * @param other The other XChainBridgeIssue.
     * @returns If the XChainBridgeIssue is equal to the other.
     */
    equals(other: IXChainBridgeIssue): boolean {
        return (
            this.currency === other.currency &&
            ((!this.issuer && !other.issuer) || (!!this.issuer && !!other.issuer && this.issuer.equals(other.issuer)))
        );
    }
}
