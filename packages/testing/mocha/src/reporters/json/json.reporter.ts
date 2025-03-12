import fs from "fs";
import path from "path";
import { Runner, reporters, Test as MochaTest, Suite as MochaSuite, MochaOptions } from "mocha";
import { JsonTestResults, TestResult } from "./json.reporter.types";

export class JsonTestReporter extends reporters.Base {
    private testResults: JsonTestResults;
    private currentSuite: string | null;

    constructor(runner: Runner, options: MochaOptions) {
        super(runner, options);

        this.testResults = {
            numTotalTests: 0,
            numPassedTests: 0,
            numFailedTests: 0,
            testResults: [],
            startTime: new Date().getTime(),
        };

        this.currentSuite = null;

        runner
            .on("start", this.onStart.bind(this))
            .on("suite", this.onSuite.bind(this))
            .on("test", this.onTest.bind(this))
            .on("pass", this.onPass.bind(this))
            .on("fail", this.onFail.bind(this))
            .on("end", this.onEnd.bind(this));
    }

    /**
     * Resets the test results.
     */
    private onStart(): void {
        this.testResults.numTotalTests = 0;
        this.testResults.numPassedTests = 0;
        this.testResults.numFailedTests = 0;
        this.testResults.testResults = [];
    }

    /**
     * Sets the current suite.
     * @param suite The suite to set.
     */
    private onSuite(suite: MochaSuite): void {
        if (suite.title) {
            this.currentSuite = suite.title;
        }
    }

    /**
     * Increments the total number of tests.
     * @param _ The test to increment.
     */
    private onTest(_: MochaTest): void {
        this.testResults.numTotalTests++;
    }

    /**
     * Increments the number of passed tests.
     * @param test The test to increment.
     */
    private onPass(test: MochaTest): void {
        this.testResults.numPassedTests++;

        const testResult: TestResult = {
            title: test.title,
            fullTitle: `${this.currentSuite} ${test.title}`,
            duration: test.duration || 0,
            status: "passed",
        };

        this.testResults.testResults.push(testResult);
    }

    /**
     * Increments the number of failed tests.
     * @param test The test to increment.
     * @param err The error to set.
     */
    private onFail(test: MochaTest, err: Error): void {
        this.testResults.numFailedTests++;

        const testResult: TestResult = {
            title: test.title,
            fullTitle: `${this.currentSuite} ${test.title}`,
            duration: test.duration || 0,
            status: "failed",
            errorMessage: err.message,
            stack: err.stack,
        };

        this.testResults.testResults.push(testResult);
    }

    /**
     * Sets the end time and success status of the test results.
     */
    private onEnd(): void {
        this.testResults.endTime = new Date().getTime();
        this.testResults.success = this.testResults.numFailedTests === 0;

        // Create output directory if it doesn't exist
        const outputDir = path.join(process.cwd(), "results");
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        // Write results to file
        fs.writeFileSync(path.join(outputDir, "results.json"), JSON.stringify(this.testResults, null, 2));
    }
}
