import { Transaction } from "@shared/modules/blockchain";

export type XrplTransaction = Transaction & { fee: string };
