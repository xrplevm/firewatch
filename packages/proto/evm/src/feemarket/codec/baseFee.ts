import { Writer, Reader } from "protobufjs/minimal";
import { QueryBaseFeeRequest, QueryBaseFeeResponse } from "../types";

/**
 * Encodes QueryBaseFeeRequest to protobuf bytes
 */
export function encodeQueryBaseFeeRequest(_: QueryBaseFeeRequest): Uint8Array {
    // QueryBaseFeeRequest is empty, so we return empty bytes
    const writer = Writer.create();
    return writer.finish();
}

/**
 * Decodes QueryBaseFeeResponse from protobuf bytes
 */
export function decodeQueryBaseFeeResponse(input: Uint8Array): QueryBaseFeeResponse {
    const reader = Reader.create(input);
    let end = reader.len;
    const message: any = {
        baseFee: ""
    };
    
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                message.baseFee = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    
    return message as QueryBaseFeeResponse;
}
