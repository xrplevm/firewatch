export type HookOptions<T = unknown> = {
    beforeAll?: () => Promise<void> | void;
    beforeEach?: () => T | Promise<T>;
    afterEach?: (ctx: T) => void | Promise<void>;
    afterAll?: () => Promise<void> | void;
};

export type Failure =
    | { hook: "beforeAll" | "afterAll"; err: Error }
    | { hook: "afterEach"; name: string; err: Error }
    | { hook: "beforeEach"; name: string; err: Error }
    | { hook?: undefined; name: string; err: Error };
