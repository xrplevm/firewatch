export type TestResult = {
    title: string;
    fullTitle: string;
    duration: number;
    status: "passed" | "failed";
    errorMessage?: string;
    stack?: string;
};

export type JsonTestResults = {
    numTotalTests: number;
    numPassedTests: number;
    numFailedTests: number;
    testResults: TestResult[];
    startTime: number;
    endTime?: number;
    success?: boolean;
};
