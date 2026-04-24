// Hand-rolled encoders/decoders for cosmos.evm.erc20.v1 messages used by the multi-minter tests.
// Upstream proto: https://github.com/cosmos/evm/blob/main/proto/cosmos/evm/erc20/v1/tx.proto
// and .../query.proto. Keep field numbers/types in sync if the upstream proto changes.
import { BinaryReader, BinaryWriter } from "cosmjs-types/binary";

export interface MsgAddMinter {
    authority: string;
    token: string;
    minterAddress: string;
}

export const MsgAddMinter = {
    typeUrl: "/cosmos.evm.erc20.v1.MsgAddMinter",
    encode(message: MsgAddMinter, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
        if (message.authority !== "") writer.uint32(10).string(message.authority);
        if (message.token !== "") writer.uint32(18).string(message.token);
        if (message.minterAddress !== "") writer.uint32(26).string(message.minterAddress);
        return writer;
    },
};

export interface MsgRemoveMinter {
    authority: string;
    token: string;
    minterAddress: string;
}

export const MsgRemoveMinter = {
    typeUrl: "/cosmos.evm.erc20.v1.MsgRemoveMinter",
    encode(message: MsgRemoveMinter, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
        if (message.authority !== "") writer.uint32(10).string(message.authority);
        if (message.token !== "") writer.uint32(18).string(message.token);
        if (message.minterAddress !== "") writer.uint32(26).string(message.minterAddress);
        return writer;
    },
};

export interface TokenPair {
    erc20Address: string;
    denom: string;
    enabled: boolean;
    contractOwner: number;
    ownerAddress: string;
    ownerAddresses: string[];
}

export const TokenPair = {
    decode(input: BinaryReader | Uint8Array, length?: number): TokenPair {
        const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
        const end = length === undefined ? reader.len : reader.pos + length;
        const message: TokenPair = {
            erc20Address: "",
            denom: "",
            enabled: false,
            contractOwner: 0,
            ownerAddress: "",
            ownerAddresses: [],
        };
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.erc20Address = reader.string();
                    break;
                case 2:
                    message.denom = reader.string();
                    break;
                case 3:
                    message.enabled = reader.bool();
                    break;
                case 4:
                    message.contractOwner = reader.int32();
                    break;
                case 5:
                    message.ownerAddress = reader.string();
                    break;
                case 6:
                    message.ownerAddresses.push(reader.string());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};

export interface QueryTokenPairRequest {
    token: string;
}

export const QueryTokenPairRequest = {
    encode(message: QueryTokenPairRequest, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
        if (message.token !== "") writer.uint32(10).string(message.token);
        return writer;
    },
};

export interface QueryTokenPairResponse {
    tokenPair: TokenPair | undefined;
}

export const QueryTokenPairResponse = {
    decode(input: BinaryReader | Uint8Array, length?: number): QueryTokenPairResponse {
        const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
        const end = length === undefined ? reader.len : reader.pos + length;
        const message: QueryTokenPairResponse = { tokenPair: undefined };
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.tokenPair = TokenPair.decode(reader, reader.uint32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};

export interface QueryOwnerAddressesRequest {
    contractAddress: string;
}

export const QueryOwnerAddressesRequest = {
    encode(message: QueryOwnerAddressesRequest, writer: BinaryWriter = BinaryWriter.create()): BinaryWriter {
        if (message.contractAddress !== "") writer.uint32(10).string(message.contractAddress);
        return writer;
    },
};

export interface QueryOwnerAddressesResponse {
    ownerAddresses: string[];
}

export const QueryOwnerAddressesResponse = {
    decode(input: BinaryReader | Uint8Array, length?: number): QueryOwnerAddressesResponse {
        const reader = input instanceof BinaryReader ? input : new BinaryReader(input);
        const end = length === undefined ? reader.len : reader.pos + length;
        const message: QueryOwnerAddressesResponse = { ownerAddresses: [] };
        while (reader.pos < end) {
            const tag = reader.uint32();
            switch (tag >>> 3) {
                case 1:
                    message.ownerAddresses.push(reader.string());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
            }
        }
        return message;
    },
};
