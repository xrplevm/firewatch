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

    private onStart(): void {
        this.testResults.numTotalTests = 0;
        this.testResults.numPassedTests = 0;
        this.testResults.numFailedTests = 0;
        this.testResults.testResults = [];
    }

    private onSuite(suite: MochaSuite): void {
        if (suite.title) {
            this.currentSuite = suite.title;
        }
    }

    private onTest(_: MochaTest): void {
        this.testResults.numTotalTests++;
    }

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
