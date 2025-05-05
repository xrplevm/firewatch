import { RequestToResponseMapping } from "./models/request";

export class AxelarscanProvider {
    constructor(private readonly apiUrl: string) {}

    /**
     * @inheritDoc
     */
    async send<T extends keyof RequestToResponseMapping>(
        requestType: T,
        body: RequestToResponseMapping[T]["request"],
    ): Promise<RequestToResponseMapping[T]["response"]> {
        const res = await fetch(this.apiUrl + requestType, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        return res.json();
    }
}
