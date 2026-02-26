/**
 * Supported chain types.
 */
export enum ChainType {
    XRP = "xrp",
    EVM = "evm",
}

/**
 * Bridge side.
 */
export enum BridgeSide {
    LOCKING = "locking",
    ISSUING = "issuing",
}

/**
 * Bridge direction.
 */
export enum BridgeDirection {
    LOCKING_TO_ISSUING = "locking-issuing",
    ISSUING_TO_LOCKING = "issuing-locking",
}

/**
 * Bridge source.
 */
export enum BridgeSource {
    ORIGIN = "origin",
    DESTINATION = "destination",
}
