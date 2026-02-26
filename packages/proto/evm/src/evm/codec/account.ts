import { Writer, Reader } from "protobufjs/minimal";
import { QueryAccountRequest, QueryAccountResponse } from "../types";

/**
 * Encodes QueryAccountRequest to protobuf bytes.
 * @param request The request to encode.
 * @returns The encoded QueryAccountRequest.
 */
export function encodeQueryAccountRequest(request: QueryAccountRequest): Uint8Array {
    const writer = Writer.create();

    if (request.address !== "") {
        writer.uint32(10).string(request.address); // field 1, wire type 2 (length-delimited)
    }

    return writer.finish();
}

/**
 * Decodes QueryAccountResponse from protobuf bytes.
 * @param input The input bytes to decode.
 * @returns The decoded QueryAccountResponse.
 */
export function decodeQueryAccountResponse(input: Uint8Array): QueryAccountResponse {
    const reader = Reader.create(input);
    const end = reader.len;
    const message: any = {
        balance: "",
        codeHash: "",
        nonce: 0,
    };

    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                message.balance = reader.string();
                break;
            case 2:
                message.codeHash = reader.string();
                break;
            case 3:
                message.nonce = reader.uint32();
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }

    return message as QueryAccountResponse;
}
