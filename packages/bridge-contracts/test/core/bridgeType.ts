import { CreateBridgeFixture } from "../fixtures/types";

export enum BridgeType {
    NATIVE,
    ISSUING_TOKEN,
    LOCKING_TOKEN,
}

export function bridgeTypeFromCreateBridgeFixture(createBridgeFixture: CreateBridgeFixture): BridgeType {
    const config = createBridgeFixture.params.config("SAFE", "TOKEN");
    if (config.issuingChainDoor === "SAFE") {
        if (config.issuingChainIssue.currency === "XRP") return BridgeType.NATIVE;
        return BridgeType.ISSUING_TOKEN;
    }
    return BridgeType.LOCKING_TOKEN;
}
