import { BaseAccount } from "cosmjs-types/cosmos/auth/v1beta1/auth";
import { Any } from "cosmjs-types/google/protobuf/any";

/**
 * EthAccount message structure from ethermint.types.v1.
 */
export interface EthAccount {
    baseAccount?: BaseAccount;
    codeHash: string;
}

/**
 * Parse EthAccount from protobuf Any message.
 * @param accountAny The Any message containing EthAccount.
 * @returns Parsed EthAccount or null if parsing fails.
 */
export function parseEthAccount(accountAny: Any): EthAccount | null {
    try {
        if (accountAny.typeUrl !== "/ethermint.types.v1.EthAccount") {
            return null;
        }

        const reader = new Uint8Array(accountAny.value);
        let position = 0;

        let baseAccount: BaseAccount | undefined;
        let codeHash = "";

        while (position < reader.length) {
            const tag = reader[position++];
            const fieldNumber = tag >> 3;
            const wireType = tag & 0x07;

            switch (fieldNumber) {
                case 1: // base_account
                    if (wireType === 2) {
                        // Length-delimited
                        const length = readVarint(reader, position);
                        position = skipVarint(reader, position);
                        const baseAccountBytes = reader.slice(position, position + length);
                        position += length;

                        // Parse BaseAccount with custom parser
                        baseAccount = parseBaseAccount(baseAccountBytes);
                    }
                    break;
                case 2: // code_hash
                    if (wireType === 2) {
                        // Length-delimited
                        const length = readVarint(reader, position);
                        position = skipVarint(reader, position);
                        const codeHashBytes = reader.slice(position, position + length);
                        position += length;
                        codeHash = new TextDecoder().decode(codeHashBytes);
                    }
                    break;
                default:
                    // Skip unknown fields
                    if (wireType === 0) {
                        // Varint
                        position = skipVarint(reader, position);
                    } else if (wireType === 2) {
                        // Length-delimited
                        const length = readVarint(reader, position);
                        position = skipVarint(reader, position);
                        position += length;
                    } else {
                        // For other wire types, try to skip safely
                        console.warn(`Unknown wire type ${wireType} for field ${fieldNumber}, skipping`);
                        break;
                    }
                    break;
            }
        }

        return { baseAccount, codeHash };
    } catch (error) {
        console.error("Failed to parse EthAccount:", error);
        return null;
    }
}

/**
 * Parse BaseAccount from protobuf bytes.
 * @param bytes The protobuf bytes.
 * @returns Parsed BaseAccount.
 */
function parseBaseAccount(bytes: Uint8Array): BaseAccount {
    let position = 0;
    let address = "";
    let accountNumber = 0n;
    let sequence = 0n;
    const pubKey: any = null;

    while (position < bytes.length) {
        if (position >= bytes.length) break;

        const tag = bytes[position++];
        const fieldNumber = tag >> 3;
        const wireType = tag & 0x07;

        switch (fieldNumber) {
            case 1: // address
                if (wireType === 2) {
                    const length = readVarint(bytes, position);
                    position = skipVarint(bytes, position);

                    // Address is stored as bech32 string in BaseAccount
                    const addressBytes = bytes.slice(position, position + length);
                    address = new TextDecoder().decode(addressBytes);
                    position += length;
                }
                break;
            case 2: // pub_key
                if (wireType === 2) {
                    const length = readVarint(bytes, position);
                    position = skipVarint(bytes, position);
                    // Skip pubkey for now - it's complex to parse
                    position += length;
                }
                break;
            case 3: // account_number
                if (wireType === 0) {
                    accountNumber = BigInt(readVarint64(bytes, position));
                    position = skipVarint(bytes, position);
                }
                break;
            case 4: // sequence
                if (wireType === 0) {
                    sequence = BigInt(readVarint64(bytes, position));
                    position = skipVarint(bytes, position);
                }
                break;
            default:
                // Skip unknown fields safely
                if (wireType === 0) {
                    position = skipVarint(bytes, position);
                } else if (wireType === 2) {
                    const length = readVarint(bytes, position);
                    position = skipVarint(bytes, position);
                    position += length;
                } else {
                    // For other wire types, just skip one byte to avoid infinite loop
                    console.warn(`Unknown wire type ${wireType} for field ${fieldNumber} in BaseAccount`);
                    position++;
                }
                break;
        }
    }

    return {
        address,
        pubKey,
        accountNumber,
        sequence,
    } as BaseAccount;
}

/**
 * Read varint from bytes (32-bit).
 * @param bytes The bytes array.
 * @param position The starting position.
 * @returns The varint value.
 */
function readVarint(bytes: Uint8Array, position: number): number {
    let result = 0;
    let shift = 0;
    while (position < bytes.length && shift < 32) {
        const byte = bytes[position];
        result |= (byte & 0x7f) << shift;
        if ((byte & 0x80) === 0) break;
        shift += 7;
        position++;
    }
    return result;
}

/**
 * Read varint from bytes (64-bit).
 * @param bytes The bytes array.
 * @param position The starting position.
 * @returns The varint value.
 */
function readVarint64(bytes: Uint8Array, position: number): number {
    let result = 0;
    let shift = 0;
    while (position < bytes.length && shift < 64) {
        const byte = bytes[position];
        result += (byte & 0x7f) * Math.pow(2, shift);
        if ((byte & 0x80) === 0) break;
        shift += 7;
        position++;
    }
    return result;
}

/**
 * Skip varint and return the new position.
 * @param bytes The bytes array.
 * @param position The starting position.
 * @returns The position after the varint.
 */
function skipVarint(bytes: Uint8Array, position: number): number {
    while (position < bytes.length && (bytes[position] & 0x80) !== 0) {
        position++;
    }
    return position < bytes.length ? position + 1 : position;
}
