import { describe as mochaDescribe, it as mochaIt } from "mocha";

/**
 * Runs the given test suite only if the given condition is true.
 * Otherwise, the test suite is skipped.
 * @param name The name of the test suite.
 * @param condition The condition to check.
 * @param fn The test suite to run.
 * @param describeFn The describe function to use.
 */
export function describeOrSkip(
    name: string,
    condition: boolean | (() => boolean),
    fn: () => void,
    describeFn = typeof describe !== "undefined" ? describe : mochaDescribe,
) {
    if (typeof condition === "function") {
        condition = condition();
    }
    if (condition) {
        describeFn(name, fn);
    } else {
        describeFn.skip(name, () => {});
    }
}

/**
 * Runs the given test only if the given condition is true.
 * Otherwise, the test is skipped.
 * @param name The name of the test.
 * @param condition The condition to check.
 * @param fn The test to run.
 * @param itFn The it function to use.
 */
export function itOrSkip(
    name: string,
    condition: boolean | (() => boolean),
    fn: () => void,
    itFn = typeof it !== "undefined" ? it : mochaIt,
) {
    if (typeof condition === "function") {
        condition = condition();
    }
    if (condition) {
        itFn(name, fn);
    } else {
        itFn.skip(name, () => {});
    }
}
