import { itParallel } from "../src/utils/parallelization";

describe("itParallel edge cases", () => {
    itParallel(
        "Description for itParallel edge case 1",
        {
            beforeAll: async () => {},
            beforeEach: async () => ({}),
            afterEach: async () => {},
            afterAll: async () => {},
        },
        [{ name: "all pass", fn: async () => {} }],
    );

    itParallel(
        "Description for itParallel edge case 2",
        {
            beforeAll: async () => {},
            beforeEach: async () => ({}),
            afterEach: async () => {},
            afterAll: async () => {},
        },
        [
            {
                name: "test fails",
                fn: async () => {
                    throw new Error("fail");
                },
            },
        ],
    );

    itParallel(
        "Description for itParallel edge case 3",
        {
            beforeAll: async () => {
                throw new Error("fail beforeAll");
            },
            beforeEach: async () => ({}),
            afterEach: async () => {},
            afterAll: async () => {},
        },
        [{ name: "should pass", fn: async () => {} }],
    );

    itParallel(
        "Description for itParallel edge case 4",
        {
            beforeAll: async () => {},
            beforeEach: async () => {
                throw new Error("fail beforeEach");
            },
            afterEach: async () => {},
            afterAll: async () => {},
        },
        [{ name: "should be skipped", fn: async () => {} }],
    );

    itParallel(
        "Description for itParallel edge case 5",
        {
            beforeAll: async () => {},
            beforeEach: async () => ({}),
            afterEach: async () => {
                throw new Error("fail afterEach");
            },
            afterAll: async () => {},
        },
        [{ name: "test passes but afterEach fails", fn: async () => {} }],
    );

    itParallel(
        "Description for itParallel edge case 6",
        {
            beforeAll: async () => {},
            beforeEach: async () => ({}),
            afterEach: async () => {},
            afterAll: async () => {
                throw new Error("fail afterAll");
            },
        },
        [{ name: "should pass", fn: async () => {} }],
    );

    itParallel(
        "Description for itParallel edge case 7",
        {
            beforeAll: async () => {
                throw new Error("fail beforeAll");
            },
            beforeEach: async () => {
                throw new Error("fail beforeEach");
            },
            afterEach: async () => {
                throw new Error("fail afterEach");
            },
            afterAll: async () => {
                throw new Error("fail afterAll");
            },
        },
        [
            {
                name: "test fails",
                fn: async () => {
                    throw new Error("fail test");
                },
            },
        ],
    );
});
