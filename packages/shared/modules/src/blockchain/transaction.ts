export type Transaction = {
    hash: string;
    confirmed: boolean;
    receipt?: any;
};

export type Confirmed<T extends Transaction> = T & {
    confirmed: true;
    receipt: any;
};

export type Unconfirmed<T extends Transaction> = {
    hash: string;
    confirmed: false;
    wait: () => Promise<Confirmed<T>>;
};
