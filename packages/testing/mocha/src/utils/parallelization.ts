import { it as mochaIt } from "mocha";
import { Failure, HookOptions } from "./types";

/**
 * Runs multiple test cases in parallel using Promise.all
 * @param description Description of the test suite.
 * @param hooks Optional hooks to run before/after tests.
 * @param tests Array of test cases with description and function.
 * @param concurrency Maximum number of tests to run in parallel.
 * @param itFn The it function to use (defaults to Mocha's it).
 */
export function itParallel<T = unknown>(
    description: string,
    hooks: HookOptions<T> = {},
    tests: Array<{ name: string; fn: (ctx: T) => void | Promise<void> }>,
    concurrency = 5,
    itFn = typeof it !== "undefined" ? it : mochaIt,
) {
    itFn(description, async function () {
        const failures: Failure[] = [];
        const results: Array<{ ok: boolean; name: string }> = [];

        try {
            await hooks.beforeAll?.();
        } catch (raw: unknown) {
            failures.push({ hook: "beforeAll", err: toError(raw) });
            // Optionally: results.push({ ok: false, name: "beforeAll" });
        }

        for (let i = 0; i < tests.length; i += concurrency) {
            const batch = tests.slice(i, i + concurrency);
            await Promise.all(
                batch.map(async ({ name, fn }) => {
                    let ctx: T | undefined;
                    let passed = false;

                    try {
                        ctx = await hooks.beforeEach?.();
                    } catch (raw: unknown) {
                        failures.push({ hook: "beforeEach", name, err: toError(raw) });
                    }

                    try {
                        await fn(ctx as T);
                        passed = true;
                    } catch (raw: unknown) {
                        failures.push({ name, err: toError(raw) });
                    }

                    try {
                        await hooks.afterEach?.(ctx as T);
                    } catch (raw: unknown) {
                        failures.push({ hook: "afterEach", name, err: toError(raw) });
                    }

                    results.push({ ok: passed, name });
                }),
            );
        }

        try {
            await hooks.afterAll?.();
        } catch (raw: unknown) {
            failures.push({ hook: "afterAll", err: toError(raw) });
            console.log(`  after all hook failed: ${toError(raw).message}`);
        }

        console.log(`\n  ${description}`);
        for (const { ok, name } of results) {
            log(ok, name, 2);
        }

        if (failures.length) {
            reportFailures(failures);
        }
    });
}

/**
 * Logs the result of a test with colored output and indentation.
 * @param ok Whether the test passed (true) or failed (false).
 * @param msg The message or name of the test to log.
 * @param indent Number of spaces to indent (default 0).
 */
function log(ok: boolean, msg: string, indent = 0) {
    const green = "\x1b[32m";
    const red = "\x1b[31m";
    const gray = "\x1b[90m";
    const reset = "\x1b[0m";
    const pad = " ".repeat(indent * 2);
    if (ok) {
        console.log(`${pad}${green}✓${reset} ${gray}${msg}${reset}`);
    } else {
        console.log(`${pad}${red}✗${reset} ${gray}${msg}${reset}`);
    }
}
/**
 * Reports all failures by formatting and throwing a summary error.
 * @param failures Array of Failure objects representing test and hook errors.
 */
function reportFailures(failures: Failure[]): never {
    const lines: string[] = [];
    let count = 1;
    for (const f of failures) {
        if ("hook" in f) {
            if (f.hook === "beforeAll") {
                lines.push(`      ${count}) before all hook failed: ${f.err.message}`);
                count++;
            } else if (f.hook === "afterAll") {
                lines.push(`      ${count}) after all hook failed: ${f.err.message}`);
                count++;
            } else if (f.hook === "beforeEach") {
                lines.push(`      ${count}) "before each" hook for "${f.name}":`);
                lines.push(`          ${f.err.message.replace(/\n/g, "\n          ")}`);
                count++;
            } else if (f.hook === "afterEach") {
                lines.push(`      ${count}) "after each" hook for "${f.name}":`);
                lines.push(`          ${f.err.message.replace(/\n/g, "\n          ")}`);
                count++;
            }
        } else {
            lines.push(`      ${count}) ${f.name}:`);
            lines.push(`          ${f.err.message.replace(/\n/g, "\n          ")}`);
            count++;
        }
    }

    throw new Error("Some tests or hooks failed:\n\n" + lines.join("\n\n"));
}

/**
 * Normalizes any thrown value to an Error object.
 * @param raw The thrown value to normalize.
 * @returns An Error object representing the thrown value.
 */
function toError(raw: unknown): Error {
    return raw instanceof Error ? raw : new Error(String(raw));
}
