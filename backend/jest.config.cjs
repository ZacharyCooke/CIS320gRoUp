/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    // Source imports use explicit ".js" extensions (required by NodeNext ESM
    // resolution) but the actual files on disk are ".ts" — map back to them.
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.json" }]
  },
  testMatch: ["<rootDir>/tests/**/*.test.ts"]
};
