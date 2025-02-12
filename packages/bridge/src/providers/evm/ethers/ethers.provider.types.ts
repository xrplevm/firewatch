export interface SubProvider {
    on: (event: string, handler: (...args: any[]) => void) => void;
    removeListener: (event: string, handler: (...args: any[]) => void) => void;
    request: (payload: { method: string; params: any[] }) => Promise<any>;
}
