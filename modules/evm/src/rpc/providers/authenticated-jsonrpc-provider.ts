import { JsonRpcProvider, FetchRequest } from "ethers";

/**
 * Custom JsonRpcProvider that supports Basic Authentication with username and password.
 */
export class AuthenticatedJsonRpcProvider extends JsonRpcProvider {
    constructor(url: string, username?: string, password?: string) {
        const fetchRequest = new FetchRequest(url);

        // Add Basic Authentication credentials if username and password are provided
        if (username && password) {
            fetchRequest.setCredentials(username, password);
        }

        super(fetchRequest);
    }
}
