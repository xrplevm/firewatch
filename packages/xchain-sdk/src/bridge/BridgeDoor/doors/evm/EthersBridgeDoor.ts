import { EvmBridgeDoor } from "./EvmBridgeDoor";
import { EthersXChainProvider } from "../../../../provider";

export class EthersBridgeDoor extends EvmBridgeDoor {
    constructor(provider: EthersXChainProvider, address: string, id?: string) {
        super(provider, address, id);
    }
}
