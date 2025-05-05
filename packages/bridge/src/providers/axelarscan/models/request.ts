import { ApiResponse, SearchGMP } from "./response";

export type SearchGMPRequest = {
    txHash: string;
};

export enum Request {
    SEARCH_GMP = "/gmp/searchGMP",
}

type RequestResponse<Req, Res> = {
    request: Req;
    response: ApiResponse<Res>;
};

export type RequestToResponseMapping = {
    [Request.SEARCH_GMP]: RequestResponse<SearchGMPRequest, SearchGMP>;
};
