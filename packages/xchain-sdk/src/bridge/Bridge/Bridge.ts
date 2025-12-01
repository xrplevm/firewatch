import { BridgeDirection, BridgeSide, BridgeSource, ChainType } from "../../common/types";
import { XChainBridge } from "../../xchain";
import {
    BridgeXChainBridge,
    BridgeXChainBridgeDestinationChain,
    BridgeXChainBridgeOriginChain,
    XChainBridgeDestinationChain,
    XChainBridgeDestinationChainType,
    XChainBridgeOriginChain,
    XChainBridgeOriginChainType,
} from "./Bridge.types";

/**
 * Type of a formatted BridgeConfig.
 */
export type FormattedBridge<
    T extends ChainType = ChainType,
    LT extends ChainType = ChainType,
    IT extends ChainType = ChainType,
    D extends BridgeDirection = BridgeDirection,
> = Bridge<LT, IT, D, T>;

/**
 * Transport class used to pass around the XChainBridge and the direction of the bridge.
 * @see `Bridge.types.ts` for the types legend.
 */
export class Bridge<
    LT extends ChainType = ChainType,
    IT extends ChainType = ChainType,
    D extends BridgeDirection = BridgeDirection,
    T extends ChainType | undefined = undefined,
> {
    /**
     * The direction of the bridge.
     */
    direction: D;
    /**
     * The format of the bridge.
     */
    format?: T;

    /**
     * The XChainBridge of the bridge as it is without any format transformation.
     */
    private _xChainBridge: XChainBridge<LT, IT>;
    /**
     * The formatted or unformatted XChainBridge of the bridge.
     * The format depends on the `format` property.
     * Use `for*` methods to get formatted BridgeConfigs.
     */
    get xChainBridge(): BridgeXChainBridge<LT, IT, T> {
        if (this.format) return this._xChainBridge.for(this.format) as BridgeXChainBridge<LT, IT, T>;
        else return this._xChainBridge as BridgeXChainBridge<LT, IT, T>;
    }

    /** Computed properties **/

    /**
     * The origin side of the bridge.
     */
    get origin(): BridgeSide {
        return this.direction === BridgeDirection.LOCKING_TO_ISSUING ? BridgeSide.LOCKING : BridgeSide.ISSUING;
    }
    /**
     * The destination side of the bridge.
     */
    get destination(): BridgeSide {
        return this.direction === BridgeDirection.LOCKING_TO_ISSUING ? BridgeSide.ISSUING : BridgeSide.LOCKING;
    }

    /**
     * The unformatted XChainBridgeChain of the origin chain of the bridge.
     */
    private get _originXChainBridgeChain(): XChainBridgeOriginChain<LT, IT, D> {
        return this._xChainBridge[`${this.origin}Chain`] as XChainBridgeOriginChain<LT, IT, D>;
    }
    /**
     * The unformatted XChainBridgeChain of the destination chain of the bridge.
     */
    private get _destinationXChainBridgeChain(): XChainBridgeDestinationChain<LT, IT, D> {
        return this._xChainBridge[`${this.destination}Chain`] as XChainBridgeDestinationChain<LT, IT, D>;
    }

    /**
     * The formatted or unformatted XChainBridgeChain of the origin chain of the bridge.
     */
    get originXChainBridgeChain(): BridgeXChainBridgeOriginChain<LT, IT, D, T> {
        return (
            this.format ? this._originXChainBridgeChain.for(this.format) : this._originXChainBridgeChain
        ) as BridgeXChainBridgeOriginChain<LT, IT, D, T>;
    }
    /**
     * The formatted or unformatted XChainBridgeChain of the destination chain of the bridge.
     */
    get destinationXChainBridgeChain(): BridgeXChainBridgeDestinationChain<LT, IT, D, T> {
        return (
            this.format ? this._destinationXChainBridgeChain.for(this.format) : this._destinationXChainBridgeChain
        ) as BridgeXChainBridgeDestinationChain<LT, IT, D, T>;
    }

    /**
     * The origin chain type of the bridge.
     */
    get originType(): ChainType {
        return this._originXChainBridgeChain.type;
    }

    /**
     * The origin chain type of the bridge.
     */
    get destinationType(): ChainType {
        return this._destinationXChainBridgeChain.type;
    }

    /**
     * Checks if the origin chain issue of the bridge is native.
     */
    get isNativeOriginIssue(): boolean {
        return this._originXChainBridgeChain.issue.isNative();
    }
    /**
     * Checks if the destination chain issue of the bridge is native.
     */
    get isNativeDestinationIssue(): boolean {
        return this._destinationXChainBridgeChain.issue.isNative();
    }

    constructor(direction: D, xChainBridge: XChainBridge<LT, IT>, format?: T) {
        this.direction = direction;
        this._xChainBridge = xChainBridge;
        this.format = format;
    }

    /**
     * Swaps the origin and destination of the bridge config.
     * @returns A new Bridge with the origin and destination swapped.
     */
    swapped(): Bridge<
        LT,
        IT,
        D extends BridgeDirection.LOCKING_TO_ISSUING ? BridgeDirection.ISSUING_TO_LOCKING : BridgeDirection.LOCKING_TO_ISSUING,
        T
    > {
        const swappedDirection =
            this.direction === BridgeDirection.LOCKING_TO_ISSUING ? BridgeDirection.ISSUING_TO_LOCKING : BridgeDirection.LOCKING_TO_ISSUING;
        return new Bridge(
            swappedDirection as D extends BridgeDirection.LOCKING_TO_ISSUING
                ? BridgeDirection.ISSUING_TO_LOCKING
                : BridgeDirection.LOCKING_TO_ISSUING,
            this._xChainBridge,
            this.format,
        );
    }

    /**
     * Transforms the Bridge to the destination format.
     * @returns A new Bridge transformed to the destination format.
     */
    forDestination(): Bridge<LT, IT, D, XChainBridgeDestinationChainType<LT, IT, D>> {
        const destinationFormat = this._destinationXChainBridgeChain.type;
        return new Bridge(this.direction, this._xChainBridge, destinationFormat);
    }

    /**
     * Transforms the Bridge to the origin format.
     * @returns A new Bridge transformed to the origin format.
     */
    forOrigin(): Bridge<LT, IT, D, XChainBridgeOriginChainType<LT, IT, D>> {
        const originFormat = this._originXChainBridgeChain.type;
        return new Bridge(this.direction, this._xChainBridge, originFormat);
    }

    /**
     * Transforms the Bridge to the given source format.
     * @param source The source to transform to.
     * @returns A new Bridge transformed to the given source format.
     */
    forSource<S extends BridgeSource>(
        source: S,
    ): Bridge<
        LT,
        IT,
        D,
        S extends BridgeSource.ORIGIN ? XChainBridgeOriginChainType<LT, IT, D> : XChainBridgeDestinationChainType<LT, IT, D>
    > {
        if (source === BridgeSource.ORIGIN)
            return this.forOrigin() as Bridge<
                LT,
                IT,
                D,
                S extends BridgeSource.ORIGIN ? XChainBridgeOriginChainType<LT, IT, D> : XChainBridgeDestinationChainType<LT, IT, D>
            >;
        else
            return this.forDestination() as Bridge<
                LT,
                IT,
                D,
                S extends BridgeSource.ORIGIN ? XChainBridgeOriginChainType<LT, IT, D> : XChainBridgeDestinationChainType<LT, IT, D>
            >;
    }

    /**
     * Transforms the Bridge to the locking format.
     * @returns A new Bridge transformed to the locking format.
     */
    forLocking(): Bridge<LT, IT, D, LT> {
        const lockingFormat = this._xChainBridge.lockingChain.type;
        return new Bridge(this.direction, this._xChainBridge, lockingFormat);
    }

    /**
     * Transforms the Bridge to the issuing format.
     * @returns A new Bridge transformed to the issuing format.
     */
    forIssuing(): Bridge<LT, IT, D, IT> {
        const issuingFormat = this._xChainBridge.issuingChain.type;
        return new Bridge(this.direction, this._xChainBridge, issuingFormat);
    }

    /**
     * Transforms the Bridge to the given side format.
     * @param side The side to transform to.
     * @returns A new Bridge transformed to the given side format.
     */
    forSide<Side extends BridgeSide>(side: Side): Bridge<LT, IT, D, Side extends BridgeSide.LOCKING ? LT : IT> {
        if (side === BridgeSide.LOCKING) return this.forLocking() as Bridge<LT, IT, D, Side extends BridgeSide.LOCKING ? LT : IT>;
        else return this.forIssuing() as Bridge<LT, IT, D, Side extends BridgeSide.LOCKING ? LT : IT>;
    }
}
