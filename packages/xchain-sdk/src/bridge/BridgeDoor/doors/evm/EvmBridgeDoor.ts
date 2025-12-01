import { ChainType } from "../../../../common/types";
import { BridgeDoor } from "../../BridgeDoor";
import { BridgeDoorProvider } from "../../interfaces";
import { PartialXChainBridge } from "../../../../xchain";

export class EvmBridgeDoor extends BridgeDoor {
    constructor(
        readonly provider: BridgeDoorProvider,
        address: string,
        id?: string,
    ) {
        super(ChainType.EVM, address, id);
    }

    getXChainBridges(): Promise<PartialXChainBridge[]> {
        return this.provider.getXChainBridges(this.address, this.id);
    }
}
