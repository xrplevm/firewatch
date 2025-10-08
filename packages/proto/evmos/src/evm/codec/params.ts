import { Writer, Reader } from "protobufjs/minimal";
import { QueryParamsRequest, QueryParamsResponse } from "../types";
import { Params, AccessControl, AccessControlType, ChainConfig, AccessType } from "../evm";

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
        chainConfig: {},
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
                params.extraEips.push(reader.string());
                break;
            case 5:
                params.chainConfig = decodeChainConfig(reader);
                break;
            case 6:
                params.allowUnprotectedTxs = reader.bool();
                break;
            case 8:
                params.evmChannels.push(reader.string());
                break;
            case 9:
                params.accessControl = decodeAccessControl(reader);
                break;
            case 10:
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
 * Decodes ChainConfig from protobuf
 */
function decodeChainConfig(reader: Reader): ChainConfig {
    const length = reader.uint32();
    const end = reader.pos + length;
    const chainConfig: any = {};
    
    while (reader.pos < end) {
        const tag = reader.uint32();
        switch (tag >>> 3) {
            case 1:
                chainConfig.homesteadBlock = reader.string();
                break;
            case 2:
                chainConfig.daoForkBlock = reader.string();
                break;
            case 3:
                chainConfig.daoForkSupport = reader.bool();
                break;
            case 4:
                chainConfig.eip150Block = reader.string();
                break;
            case 5:
                chainConfig.eip150Hash = reader.string();
                break;
            case 6:
                chainConfig.eip155Block = reader.string();
                break;
            case 7:
                chainConfig.eip158Block = reader.string();
                break;
            case 8:
                chainConfig.byzantiumBlock = reader.string();
                break;
            case 9:
                chainConfig.constantinopleBlock = reader.string();
                break;
            case 10:
                chainConfig.petersburgBlock = reader.string();
                break;
            case 11:
                chainConfig.istanbulBlock = reader.string();
                break;
            case 12:
                chainConfig.muirGlacierBlock = reader.string();
                break;
            case 13:
                chainConfig.berlinBlock = reader.string();
                break;
            case 17:
                chainConfig.londonBlock = reader.string();
                break;
            case 18:
                chainConfig.arrowGlacierBlock = reader.string();
                break;
            case 20:
                chainConfig.grayGlacierBlock = reader.string();
                break;
            case 21:
                chainConfig.mergeNetsplitBlock = reader.string();
                break;
            case 22:
                chainConfig.shanghaiBlock = reader.string();
                break;
            case 23:
                chainConfig.cancunBlock = reader.string();
                break;
            default:
                reader.skipType(tag & 7);
                break;
        }
    }
    
    return chainConfig as ChainConfig;
}

/**
 * Decodes AccessControl from protobuf
 */
function decodeAccessControl(reader: Reader): AccessControl {
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
function decodeAccessControlType(reader: Reader): AccessControlType {
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
