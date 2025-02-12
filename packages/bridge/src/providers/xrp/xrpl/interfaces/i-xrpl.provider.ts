import { IXrplSignerProvider } from "../../../../signers/xrp/xrpl/interfaces/i-xrpl-signer.provider";
import { IXrpProvider } from "../../interfaces/i-xrp.provider";

export interface IXrplProvider extends IXrpProvider, IXrplSignerProvider {}
