/**
 * LEGEND:
 * LT = Locking Chain Type
 * IT = Issuing Chain Type
 * D = Bridge Direction
 * T = Format Type
 */

import { BridgeDirection, ChainType } from "../../common/types";
import { XChainBridge, XChainBridgeChain, XChainBridgeChainFormat, XChainBridgeFormat } from "../../xchain";

/**
 * The type of the XChainBridgeChainFormat of the origin chain of the bridge.
 */
export type XChainBridgeOriginChainType<
    LT extends ChainType,
    IT extends ChainType,
    D extends BridgeDirection,
> = D extends BridgeDirection.LOCKING_TO_ISSUING ? LT : IT;

/**
 * The type of the XChainBridgeChainFormat of the destination chain of the bridge.
 */
export type XChainBridgeDestinationChainType<
    LT extends ChainType,
    IT extends ChainType,
    D extends BridgeDirection,
> = D extends BridgeDirection.LOCKING_TO_ISSUING ? IT : LT;

/**
 * The XChainBridgeChainFormat of the origin chain of the bridge.
 */
export type XChainBridgeOriginChain<LT extends ChainType, IT extends ChainType, D extends BridgeDirection> = XChainBridgeChain<
    XChainBridgeOriginChainType<LT, IT, D>
>;

/**
 * The XChainBridgeChainFormat of the destination chain of the bridge.
 */
export type XChainBridgeDestinationChain<LT extends ChainType, IT extends ChainType, D extends BridgeDirection> = XChainBridgeChain<
    XChainBridgeDestinationChainType<LT, IT, D>
>;

/**
 * The XChainBridge type of the bridge.
 */
export type BridgeXChainBridge<LT extends ChainType, IT extends ChainType, T extends ChainType | undefined> = T extends ChainType
    ? XChainBridgeFormat<T>
    : XChainBridge<LT, IT>;

/**
 * The XChainBridgeChain type of the bridge chain.
 */
export type BridgeXChainBridgeChain<T extends ChainType = ChainType, F extends ChainType | undefined = undefined> = F extends undefined
    ? XChainBridgeChain<T>
    : XChainBridgeChainFormat<F>;

/**
 * The XChainBridgeChain of the origin chain of the bridge.
 */
export type BridgeXChainBridgeOriginChain<
    LT extends ChainType,
    IT extends ChainType,
    D extends BridgeDirection,
    T extends ChainType | undefined,
> = BridgeXChainBridgeChain<XChainBridgeOriginChainType<LT, IT, D>, T>;

/**
 * The XChainBridgeChain of the destination chain of the bridge.
 */
export type BridgeXChainBridgeDestinationChain<
    LT extends ChainType,
    IT extends ChainType,
    D extends BridgeDirection,
    T extends ChainType | undefined,
> = BridgeXChainBridgeChain<XChainBridgeDestinationChainType<LT, IT, D>, T>;
