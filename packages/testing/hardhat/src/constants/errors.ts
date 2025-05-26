export enum HardhatErrors {
    TRANSACTION_REVERTED = "Transaction reverted unexpectedly",
    TRANSACTION_NOT_MINED = "Transaction receipt is null. The transaction might not have been mined yet.",
    TRANSACTION_DID_NOT_REVERT = "Transaction did not revert as expected",
    TRANSACTION_REVERTED_WITH_UNEXPECTED_REASON = "Transaction reverted with an unexpected reason",
}
