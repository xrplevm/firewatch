import { BigNumber, ContractReceipt } from "ethers";

export const claimIdFromTransaction = (tx: ContractReceipt): BigNumber => {
    // @ts-ignore
    return tx.events.filter((event) => event.event === "CreateClaim")[0].args.claimId;
};
