export enum HardhatErrors {
    UNKNOWN_CUSTOM_ERROR = "execution reverted (unknown custom error)",
    TRANSACTION_NOT_MINED = "Transaction receipt is null. The transaction might not have been mined yet.",
    INTERCHAIN_TRANSFER_NOT_MINTED = "Interchain transfer did not result in minted tokens as expected.",
}
