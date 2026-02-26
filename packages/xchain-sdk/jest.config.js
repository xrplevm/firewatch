module.exports = {
    preset: "ts-jest",
    moduleDirectories: ["<rootDir>", "node_modules"],
    collectCoverageFrom: [
        // UI
        "src/**/*.(ts|js|tsx|jsx)",
    ],
    coverageThreshold: {
        global: {
            branches: 0,
            statements: 0,
        },
    },
};
