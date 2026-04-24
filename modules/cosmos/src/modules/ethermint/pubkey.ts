/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable @typescript-eslint/naming-convention */
import { isEd25519Pubkey, isMultisigThresholdPubkey, isSecp256k1Pubkey, Pubkey } from "@cosmjs/amino";
import { fromBase64 } from "@cosmjs/encoding";
import { Uint53 } from "@cosmjs/math";
import { PubKey as CosmosCryptoEd25519Pubkey } from "cosmjs-types/cosmos/crypto/ed25519/keys";
import { LegacyAminoPubKey } from "cosmjs-types/cosmos/crypto/multisig/keys";
import { PubKey as CosmosCryptoSecp256k1Pubkey } from "cosmjs-types/cosmos/crypto/secp256k1/keys";
import { Any } from "cosmjs-types/google/protobuf/any";

const isEvm256k1Pubkey = (pubkey: Pubkey): boolean => {
    return pubkey.type === "ethermint.crypto.v1.ethsecp256k1.PubKey";
};

export function encodePubkey(pubkey: Pubkey): Any {
    if (isSecp256k1Pubkey(pubkey)) {
        const pubkeyProto = CosmosCryptoSecp256k1Pubkey.fromPartial({
            key: fromBase64(pubkey.value),
        });
        return Any.fromPartial({
            typeUrl: "/cosmos.crypto.secp256k1.PubKey",
            value: Uint8Array.from(CosmosCryptoSecp256k1Pubkey.encode(pubkeyProto).finish()),
        });
    } else if (isEvm256k1Pubkey(pubkey)) {
        const pubkeyProto = CosmosCryptoSecp256k1Pubkey.fromPartial({
            key: fromBase64(pubkey.value),
        });
        return Any.fromPartial({
            typeUrl: "/ethermint.crypto.v1.ethsecp256k1.PubKey",
            value: Uint8Array.from(CosmosCryptoSecp256k1Pubkey.encode(pubkeyProto).finish()),
        });
    } else if (isEd25519Pubkey(pubkey)) {
        const pubkeyProto = CosmosCryptoEd25519Pubkey.fromPartial({
            key: fromBase64(pubkey.value),
        });
        return Any.fromPartial({
            typeUrl: "/cosmos.crypto.ed25519.PubKey",
            value: Uint8Array.from(CosmosCryptoEd25519Pubkey.encode(pubkeyProto).finish()),
        });
    } else if (isMultisigThresholdPubkey(pubkey)) {
        const pubkeyProto = LegacyAminoPubKey.fromPartial({
            threshold: Uint53.fromString(pubkey.value.threshold).toNumber(),
            publicKeys: pubkey.value.pubkeys.map(encodePubkey),
        });
        return Any.fromPartial({
            typeUrl: "/cosmos.crypto.multisig.LegacyAminoPubKey",
            value: Uint8Array.from(LegacyAminoPubKey.encode(pubkeyProto).finish()),
        });
    } else {
        throw new Error(`Pubkey type ${pubkey.type} not recognized`);
    }
}
