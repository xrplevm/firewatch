export type TokenObject = {
    id?: string;
    symbol: string;
    decimals: number;
    name: string;
    image?: string;
    address?: string;
};

export class Token {
    id?: string;
    symbol: string;
    decimals: number;
    name: string;
    image?: string;
    address?: string;

    constructor(token: TokenObject) {
        this.id = token.id;
        this.symbol = token.symbol;
        this.decimals = token.decimals;
        this.name = token.name;
        this.image = token.image;
        this.address = token.address;
    }

    /**
     * Checks if the token is a native token.
     * @returns True if the token is a native token, false otherwise.
     */
    isNative(): boolean {
        return this.address === undefined;
    }
}
