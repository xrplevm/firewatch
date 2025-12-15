import { PartialXChainBridge } from "../../../xchain";

export interface BridgeDoorProvider {
    getXChainBridges(doorAddress: string, id?: string): Promise<PartialXChainBridge[]>;
}
