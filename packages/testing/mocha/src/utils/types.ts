export type HookOptions = {
    beforeAll?: () => Promise<void> | void;
    beforeEach?: () => Promise<void> | void;
    afterEach?: () => Promise<void> | void;
    afterAll?: () => Promise<void> | void;
};
