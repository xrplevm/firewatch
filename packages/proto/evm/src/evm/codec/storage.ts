import { Writer, Reader } from "protobufjs/minimal";
import { QueryStorageRequest, QueryStorageResponse } from "../types";

/**
 * Encodes QueryStorageRequest to protobuf bytes.
 * @param request The request to encode.
 * @returns The encoded QueryStorageRequest.
 */
export function encodeQueryStorageRequest(request: QueryStorageRequest): Uint8Array {
    const writer = Writer.create();

    if (request.address !== "") {
        writer.uint32(10).string(request.address); // field 1, wire type 2 (length-delimited)
    }

    if (request.key !== "") {
        writer.uint32(18).string(request.key); // field 2, wire type 2 (length-delimited)
    }

    return writer.finish();
}

/**
 * Decodes QueryStorageResponse from protobuf bytes.
 * @param input The input bytes to decode.
 * @returns The decoded QueryStorageResponse.
 */
export function decodeQueryStorageResponse(input: Uint8Array): QueryStorageResponse {
    const reader = Reader.create(input);
    const end = reader.len;
    const message: any = {
        value: "",
    };

    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                message.value = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }

    return message as QueryStorageResponse;
}
