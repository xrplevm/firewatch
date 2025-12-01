import { AnyObject } from "@swisstype/essential";
import { XrplSubmittableTransaction, XrplTxResponse } from "../../../src/transaction/parsers/xrp";
import { mockify } from "../../utils/mockify";

export const XrplTxResponseMock = mockify<XrplTxResponse<XrplSubmittableTransaction & AnyObject>>();
