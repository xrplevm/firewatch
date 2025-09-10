import { Writer, Reader } from "protobufjs/minimal";
import { QueryParamsRequest, QueryParamsResponse } from "../types";
import { Params } from "../evm";

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
        evmDenom: "",
        extraEips: [],
        allowUnprotectedTxs: false,
        evmChannels: [],
        accessControl: { create: { accessType: 0, accessControlList: [] }, call: { accessType: 0, accessControlList: [] } },
        activeStaticPrecompiles: []
    };
    
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                params.evmDenom = reader.string();
                break;
            case 4:
                if ((tag & 7) === 2) {
                    const end2 = reader.uint32() + reader.pos;
                    while (reader.pos < end2) {
                        params.extraEips.push(reader.int64());
                    }
                } else {
                    params.extraEips.push(reader.int64());
                }
                break;
            case 5:
                params.allowUnprotectedTxs = reader.bool();
                break;
            case 7:
                params.evmChannels.push(reader.string());
                break;
            case 8:
                params.accessControl = decodeAccessControl(reader);
                break;
            case 9:
                params.activeStaticPrecompiles.push(reader.string());
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    
    return params as Params;
}

/**
 * Decodes AccessControl from protobuf
 */
function decodeAccessControl(reader: Reader): any {
    const length = reader.uint32();
    const end = reader.pos + length;
    const accessControl: any = {
        create: { accessType: 0, accessControlList: [] },
        call: { accessType: 0, accessControlList: [] }
    };
    
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                accessControl.create = decodeAccessControlType(reader);
                break;
            case 2:
                accessControl.call = decodeAccessControlType(reader);
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    
    return accessControl;
}

/**
 * Decodes AccessControlType from protobuf
 */
function decodeAccessControlType(reader: Reader): any {
    const length = reader.uint32();
    const end = reader.pos + length;
    const accessControlType: any = {
        accessType: 0,
        accessControlList: []
    };
    
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                accessControlType.accessType = reader.int32();
                break;
            case 2:
                accessControlType.accessControlList.push(reader.string());
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    
    return accessControlType;
}
