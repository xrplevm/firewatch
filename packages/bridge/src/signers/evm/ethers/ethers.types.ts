import { Transaction } from "@shared/modules/blockchain";

export type EthersTransaction = Transaction & { gasUsed: bigint; gasPrice: bigint };
