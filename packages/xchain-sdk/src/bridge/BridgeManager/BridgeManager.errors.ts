import { EnhancedError, EnhancedErrorArgs } from "../../common/utils/error";

export enum BridgeManagerErrors {
    EMPTY_BRIDGE_DOOR_PAIR = "There are no bridges between {{mainchain}} and {{sidechain}}.",
    BRIDGE_NOT_FOUND_FOR_ISSUE = "Bridge not found for issue with currency {{currency}} and issuer {{issuer}} between {{mainchain}} and {{sidechain}}.",
    MIN_CREATE_ACCOUNT_NOT_SET = "Tried to transfer {{currency}} from {{origin}} to {{destination}} but the `minAccountCreate` property was not set in the origin bridge door ({{origin}}).",
    INSUFFICIENT_CREATE_ACCOUNT_AMOUNT = "Tried to transfer {{currency}} from {{origin}} to {{destination}} but the amount provided ({{amount}}) is lower than the `minAccountCreate` ({{minAccountCreate}}) of the origin bridge door ({{origin}}).",
    DOOR_NOT_FOUND = "Bridge door {{doorAddress}} does not exists in the bridge manager bridge door pair.",
    WALLET_DOOR_TYPE_MISMATCH = "The wallet type {{walletType}} does not match the bridge door type {{bridgeDoorType}}.",
    DESTINATION_CANNOT_PAY_SIGNATURE_REWARD = "Tried to transfer {{currency}} from {{origin}} to {{destination}} but the destination does not have enough funds to pay the `signatureReward` ({{signatureReward}}) of the destination bridge door ({{destination}}). Beware that the `signatureReward` is paid in the destination bridge door native currency.",
    ORIGIN_CANNOT_PAY_SIGNATURE_REWARD = "Tried to transfer {{currency}} from {{origin}} to {{destination}} but the origin does not have enough funds to pay the `signatureReward` ({{signatureReward}}) of the destination bridge door ({{destination}}). Beware that the `signatureReward` is paid in the destination bridge door native currency.",
}

export class BridgeManagerError<E extends BridgeManagerErrors> extends EnhancedError<E> {
    constructor(...args: EnhancedErrorArgs<E>) {
        super(...args);
        this.name = "BridgeManagerError";
    }
}
