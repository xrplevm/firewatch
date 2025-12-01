import { AnyObject } from "@swisstype/essential";
import { mockify } from "../../utils/mockify";
import { XrplSubmitTransactionResponse, XrplSubmittableTransaction } from "../../../src/transaction/parsers/xrp";

export const XrplSubmitTransactionResponseMock = mockify<XrplSubmitTransactionResponse<XrplSubmittableTransaction & AnyObject>>({
    result: { tx_json: { hash: "1234" }, engine_result: "tesSUCCESS" },
});
