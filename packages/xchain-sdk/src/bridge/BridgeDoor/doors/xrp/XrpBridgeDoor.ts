import { ChainType } from "../../../../common/types";
import { PartialXChainBridge } from "../../../../xchain";
import { BridgeDoor } from "../../BridgeDoor";
import { BridgeDoorProvider } from "../../interfaces";

export class XrpBridgeDoor extends BridgeDoor<ChainType.XRP> {
    constructor(
        readonly provider: BridgeDoorProvider,
        address: string,
        id?: string,
    ) {
        super(ChainType.XRP, address, id);
    }

    getXChainBridges(): Promise<PartialXChainBridge[]> {
        return this.provider.getXChainBridges(this.address, this.id);
    }
}
