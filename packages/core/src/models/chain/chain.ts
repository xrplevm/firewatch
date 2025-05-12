import { ChainType } from "@shared/modules/chain";
import { Token, TokenObject } from "../token";
import { Env } from "@firewatch/env/types";

export type ChainUrlsObject = {
    rpc?: string;
    ws?: string;
    faucet?: string;
};

export type ChainObject = {
    id: string;
    name: string;
    symbol: string;
    chainId?: number;
    image?: string;
    env: Env;
    type: ChainType;
    nativeToken: TokenObject;
    urls: ChainUrlsObject;
};

export class Chain {
    id: string;
    name: string;
    symbol: string;
    chainId?: number;
    image?: string;
    type: ChainType;
    env: Env;
    nativeToken: Token;
    urls: ChainUrlsObject;

    constructor(chain: ChainObject) {
        this.id = chain.id;
        this.name = chain.name;
        this.symbol = chain.symbol;
        this.chainId = chain.chainId;
        this.image = chain.image;
        this.type = chain.type;
        this.env = chain.env;
        this.nativeToken = new Token(chain.nativeToken);
        this.urls = chain.urls;
    }
}
