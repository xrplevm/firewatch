import { XrplXChainProvider } from "../../../../provider";
import { XrpBridgeDoor } from "./XrpBridgeDoor";

export class XrplBridgeDoor extends XrpBridgeDoor {
    constructor(provider: XrplXChainProvider, address: string, id?: string) {
        super(provider, address, id);
    }
}
