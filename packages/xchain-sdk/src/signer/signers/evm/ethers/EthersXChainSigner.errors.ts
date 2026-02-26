import { EnhancedError, EnhancedErrorArgs } from "../../../../common/utils/error";

export enum EthersXChainSignerErrors {
    PROVIDER_NOT_PROVIDED = "A provider must be provided. Either attach the ethers signer to an ethers provider or provide a custom provider.",
    INVALID_ERC20_ADDRESS = "Invalid ERC20 address",
    TOKEN_ADDRESS_ALREADY_USED = "Token address already used",
}

export class EthersXChainSignerError<E extends EthersXChainSignerErrors> extends EnhancedError<E> {
    constructor(...args: EnhancedErrorArgs<E>) {
        super(...args);
        this.name = "EthersXChainSignerError";
    }
}
