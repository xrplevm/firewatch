import { Writer, Reader } from "protobufjs/minimal";
import { QueryBlockGasRequest, QueryBlockGasResponse } from "../types";

/**
 * Encodes QueryBlockGasRequest to protobuf bytes
 */
export function encodeQueryBlockGasRequest(_: QueryBlockGasRequest): Uint8Array {
    // QueryBlockGasRequest is empty, so we return empty bytes
    const writer = Writer.create();
    return writer.finish();
}

/**
 * Decodes QueryBlockGasResponse from protobuf bytes
 */
export function decodeQueryBlockGasResponse(input: Uint8Array): QueryBlockGasResponse {
    const reader = Reader.create(input);
    let end = reader.len;
    const message: any = {
        gas: 0
    };
    
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                message.gas = reader.int64();
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    
    return message as QueryBlockGasResponse;
}
