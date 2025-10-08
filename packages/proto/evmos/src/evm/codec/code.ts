import { Writer, Reader } from "protobufjs/minimal";
import { QueryCodeRequest, QueryCodeResponse } from "../types";

/**
 * Encodes QueryCodeRequest to protobuf bytes
 */
export function encodeQueryCodeRequest(request: QueryCodeRequest): Uint8Array {
    const writer = Writer.create();
    
    if (request.address !== "") {
        writer.uint32(10).string(request.address); // field 1, wire type 2 (length-delimited)
    }
    
    return writer.finish();
}

/**
 * Decodes QueryCodeResponse from protobuf bytes
 */
export function decodeQueryCodeResponse(input: Uint8Array): QueryCodeResponse {
    const reader = Reader.create(input);
    let end = reader.len;
    const message: any = {
        code: new Uint8Array()
    };
    
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                message.code = reader.bytes();
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    
    return message as QueryCodeResponse;
}
