import { StdSignature } from "@cosmjs/amino";
import { toBase64 } from "@cosmjs/encoding";

/**
 * Takes a binary pubkey and signature to create a signature object.
 * @param pubkey A compressed secp256k1 public key.
 * @param signature A 64 byte fixed length representation of secp256k1 signature components r and s.
 * @param isEthermint Whether to use Ethermint pubkey type or standard Cosmos pubkey type.
 * @returns A StdSignature containing the encoded public key and base64 signature.
 */
export function encodeSecp256k1Signature(pubkey: Uint8Array, signature: Uint8Array, isEthermint = false): StdSignature {
    if (signature.length !== 64) {
        throw new Error(
            "Signature must be 64 bytes long. Cosmos SDK uses a 2x32 byte fixed length encoding for the secp256k1 signature integers r and s.",
        );
    }

    return {
        pub_key: encodeSecp256k1Pubkey(pubkey, isEthermint),
        signature: toBase64(signature),
    };
}

/**
 * Takes a Secp256k1 public key as raw bytes and returns the Amino JSON representation of it (the type/value wrapper object).
 * @param pubkey A compressed secp256k1 public key.
 * @param isEthermint Whether to use Ethermint pubkey type or standard Cosmos pubkey type.
 * @returns A Secp256k1Pubkey containing the encoded public key.
 */
export function encodeSecp256k1Pubkey(pubkey: Uint8Array, isEthermint = false) {
    if (pubkey.length !== 33 || (pubkey[0] !== 0x02 && pubkey[0] !== 0x03)) {
        throw new Error("Public key must be compressed secp256k1, i.e. 33 bytes starting with 0x02 or 0x03");
    }
    return {
        type: isEthermint ? "ethermint.crypto.v1.ethsecp256k1.PubKey" : "cosmos.crypto.secp256k1.PubKey",
        value: toBase64(pubkey),
    };
}
