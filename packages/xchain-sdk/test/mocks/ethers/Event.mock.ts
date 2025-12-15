import { ethers } from "ethers";

export type ImplementedEvent = Pick<ethers.Event, "event" | "args">;

export class EventMock implements ImplementedEvent {
    event: string;
    args: ethers.utils.Result;

    constructor({ event = "Transfer", args = [] }: Partial<ImplementedEvent> = {}) {
        this.event = event;
        this.args = args;
    }
}
