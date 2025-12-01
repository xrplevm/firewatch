import { AddressTransformers } from "../address/AddressTransformer";
import { ChainType } from "../common/types";
import { capitalize } from "../common/utils/string";

export interface IXChainAddress {
    address: string;
    for(format: ChainType): string;
}

/**
 * XChainAddress.
 */
export class XChainAddress<F extends ChainType> {
    /**
     * The address.
     */
    address: string;
    /**
     * The address format.
     */
    format: F;

    constructor(address: string, format: F) {
        this.address = address;
        this.format = format;
    }

    /**
     * Creates an XChainAddress from an XRP address.
     * @param address The address.
     * @returns The XChainAddress.
     */
    static fromXrp(address: string): XChainAddress<ChainType.XRP> {
        return new XChainAddress(address, ChainType.XRP);
    }

    /**
     * Creates an XChainAddress from an EVM address.
     * @param address The address.
     * @returns The XChainAddress.
     */
    static fromEvm(address: string): XChainAddress<ChainType.EVM> {
        return new XChainAddress(address, ChainType.EVM);
    }

    /**
     * Creates an XChainAddress from an address with a given format.
     * @param format The format.
     * @param address The address.
     * @returns The XChainAddress.
     */
    static from<F extends ChainType>(format: ChainType, address: string): XChainAddress<F> {
        return this[`from${capitalize(format)}`](address) as XChainAddress<F>;
    }

    /**
     * Transforms the address to an XRP address.
     * @returns The XRP address.
     */
    forXrp(): string {
        return AddressTransformers[this.format][ChainType.XRP](this.address);
    }

    /**
     * Transforms the address to an EVM address.
     * @returns The EVM address.
     */
    forEvm(): string {
        return AddressTransformers[this.format][ChainType.EVM](this.address).toLowerCase();
    }

    /**
     * Transforms the address to an address with a given format.
     * @param format The format.
     * @returns The address.
     */
    for(format: ChainType): string {
        return this[`for${capitalize(format)}`]();
    }

    /**
     * Checks if the XChainAddress is equal to another.
     * @param other The other XChainAddress.
     * @returns If the XChainAddress is equal to the other.
     */
    equals(other: IXChainAddress): boolean {
        return this.for(this.format) === other.for(this.format);
    }
}
