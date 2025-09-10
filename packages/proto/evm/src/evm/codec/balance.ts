import { Writer, Reader } from "protobufjs/minimal";
import { QueryBalanceRequest, QueryBalanceResponse } from "../types";

/**
 * Encodes QueryBalanceRequest to protobuf bytes.
 * @param request The request to encode.
 * @returns The encoded QueryBalanceRequest.
 */
export function encodeQueryBalanceRequest(request: QueryBalanceRequest): Uint8Array {
    const writer = Writer.create();

    if (request.address !== "") {
        writer.uint32(10).string(request.address); // field 1, wire type 2 (length-delimited)
    }

    return writer.finish();
}

/**
 * Decodes QueryBalanceResponse from protobuf bytes.
 * @param input The input bytes to decode.
 * @returns The decoded QueryBalanceResponse.
 */
export function decodeQueryBalanceResponse(input: Uint8Array): QueryBalanceResponse {
    const reader = Reader.create(input);
    const end = reader.len;
    const message: any = {
        balance: "",
    };

    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                message.balance = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }

    return message as QueryBalanceResponse;
}
