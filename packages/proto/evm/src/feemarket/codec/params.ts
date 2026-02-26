import { Writer, Reader } from "protobufjs/minimal";
import { QueryParamsRequest, QueryParamsResponse, Params } from "../types";

/**
 * Encodes QueryParamsRequest to protobuf bytes
 */
export function encodeQueryParamsRequest(_: QueryParamsRequest): Uint8Array {
    // QueryParamsRequest is empty, so we return empty bytes
    const writer = Writer.create();
    return writer.finish();
}

/**
 * Decodes QueryParamsResponse from protobuf bytes
 */
export function decodeQueryParamsResponse(input: Uint8Array): QueryParamsResponse {
    const reader = Reader.create(input);
    let end = reader.len;
    const message: any = {};
    
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                message.params = decodeParams(reader);
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    
    return message as QueryParamsResponse;
}

/**
 * Decodes Params from protobuf
 */
function decodeParams(reader: Reader): Params {
    const length = reader.uint32();
    const end = reader.pos + length;
    const params: any = {
        noBaseFee: false,
        baseFeeChangeDenominator: 0,
        elasticityMultiplier: 0,
        enableHeight: 0,
        baseFee: "",
        minGasPrice: "",
        minGasMultiplier: ""
    };
    
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                params.noBaseFee = reader.bool();
                break;
            case 2:
                params.baseFeeChangeDenominator = reader.uint32();
                break;
            case 3:
                params.elasticityMultiplier = reader.uint32();
                break;
            case 5:
                params.enableHeight = reader.string();
                break;
            case 6:
                params.baseFee = reader.string();
                break;
            case 7:
                params.minGasPrice = reader.string();
                break;
            case 8:
                params.minGasMultiplier = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    
    return params as Params;
}
