import { EventLog } from "ethers";

export interface ExtendedEventLog<T = unknown> extends EventLog {
    decodedArgs: Record<string, T>;
}
