import { AnyObject } from "@swisstype/essential";
import { mockify } from "../../utils/mockify";
import { XrplTxResponseResult, XrplSubmittableTransaction } from "../../../src/transaction/parsers/xrp";

export const XrplTxResponseResultMock = mockify<XrplTxResponseResult<XrplSubmittableTransaction & AnyObject>>();
