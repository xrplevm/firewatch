import { it as mochaIt, describe as mochaDescribe } from "mocha";
import { HookOptions } from "./types";

/**
 * Runs multiple describe blocks in parallel using Promise.all
 * @param suiteName The name of the test suite
 * @param hooks Optional hooks to run before/after the entire parallel suite
 * @param describes Array of describe blocks to execute in parallel
 * @param describeFn The describe function to use (defaults to Mocha's describe)
 */
export function describeParallel(
    suiteName: string,
    hooks: HookOptions = {},
    describes: Array<{ name: string; fn: () => Promise<void> | void }>,
    describeFn = typeof describe !== "undefined" ? describe : mochaDescribe,
) {
    describeFn(`[PARALLEL] ${suiteName}`, function () {
        if (hooks.beforeAll) before(hooks.beforeAll);

        if (hooks.afterAll) after(hooks.afterAll);

        it("[PARALLEL] Executes all describes", async function () {
            const results = await Promise.all(
                describes.map(async (subsuite) => {
                    try {
                        console.log(`\t→ ${subsuite.name} [START]`);
                        await subsuite.fn();
                        console.log(`\t→ ${subsuite.name} [OK]`);
                        return { success: true, name: subsuite.name };
                    } catch (err) {
                        console.error(`\t→ ${subsuite.name} [FAIL]\n\t\t${(err as Error).message}`);
                        return { success: false, name: subsuite.name, error: err as Error };
                    }
                }),
            );
            const errors = results.filter((r) => !r.success);
            if (errors.length > 0) {
                const errorMessage = errors.map((e) => `\t→ ${e.name} [FAIL]\n\t\t${e.error?.message.replace(/\n/g, "\n\t\t")}`).join("\n");
                throw new Error(`[describeParallel] Some describes failed:\n${errorMessage}`);
            }
        });
    });
}

/**
 * Runs multiple test cases in parallel using Promise.all
 * @param tests Array of test cases with description and function
 * @param hooks Optional hooks to run before/after tests
 * @param concurrencyLimit Maximum number of tests to run in parallel
 * @param itFn The it function to use (defaults to Mocha's it)
 */
export function itParallel(
    tests: Array<{ name: string; fn: () => Promise<void> | void }>,
    hooks: HookOptions = {},
    concurrencyLimit = 5,
    itFn = typeof it !== "undefined" ? it : mochaIt,
) {
    itFn(`Parallel execution of ${tests.length} tests`, async function () {
        let beforeAllError = null;
        try {
            if (hooks.beforeAll) {
                await hooks.beforeAll();
            }
        } catch (error) {
            beforeAllError = {
                message: `beforeAll hook failed: ${error instanceof Error ? error.message : String(error)}`,
                original: error,
            };
            console.log(`[SUITE] beforeAll hook failed: ${beforeAllError.message}`);
        }

        const results = [];

        for (let i = 0; i < tests.length; i += concurrencyLimit) {
            const batch = tests.slice(i, i + concurrencyLimit);
            const batchResults = await Promise.all(
                batch.map(async (test) => {
                    let hookError = null;

                    try {
                        if (hooks.beforeEach) {
                            await hooks.beforeEach();
                        }
                    } catch (error) {
                        hookError = {
                            message: `beforeEach hook failed: ${error instanceof Error ? error.message : String(error)}`,
                            original: error,
                        };
                        console.log(`    ✗ ${test.name} (beforeEach hook failed)`);
                    }

                    if (!hookError) {
                        try {
                            await test.fn();
                            console.log(`    ✓ ${test.name}`);
                        } catch (error) {
                            hookError = {
                                message: `test execution failed: ${error instanceof Error ? error.message : String(error)}`,
                                original: error,
                            };
                            console.log(`    ✗ ${test.name}`);
                        }
                    }

                    try {
                        if (hooks.afterEach) {
                            await hooks.afterEach();
                        }
                    } catch (error) {
                        if (!hookError) {
                            hookError = {
                                message: `afterEach hook failed: ${error instanceof Error ? error.message : String(error)}`,
                                original: error,
                            };
                            console.log(`    ✗ ${test.name} (afterEach hook failed)`);
                        } else {
                            console.log(
                                `    → ${test.name} (afterEach hook also failed: ${error instanceof Error ? error.message : String(error)})`,
                            );
                        }
                    }

                    return hookError
                        ? { success: false, name: test.name, error: new Error(hookError.message) }
                        : { success: true, name: test.name };
                }),
            );
            results.push(...batchResults);
        }

        let afterAllError = null;
        try {
            if (hooks.afterAll) {
                await hooks.afterAll();
            }
        } catch (error) {
            afterAllError = {
                message: `afterAll hook failed: ${error instanceof Error ? error.message : String(error)}`,
                original: error,
            };
            console.log(`[SUITE] afterAll hook failed: ${afterAllError.message}`);
        }

        const errors = results.filter((r) => !r.success);
        if (beforeAllError || afterAllError || errors.length > 0) {
            let errorMessage = "";

            if (beforeAllError) {
                errorMessage += `[SUITE] beforeAll hook failed: ${beforeAllError.message}\n`;
            }

            if (errors.length > 0) {
                errorMessage +=
                    errors.map((e) => `    ✗ ${e.name}\n      ${e.error?.message.replace(/\n/g, "\n      ")}`).join("\n") + "\n";
            }

            if (afterAllError) {
                errorMessage += `[SUITE] afterAll hook failed: ${afterAllError.message}`;
            }

            throw new Error(`Some tests or hooks failed:\n${errorMessage}`);
        }
    });
}
