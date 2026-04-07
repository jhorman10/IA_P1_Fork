/**
 * SPEC-004: Jest configuration for auth-aware E2E tests.
 *
 * Runs from backend/producer/ so all node_modules are available.
 * Test files live in backend/e2e/ and import producer source via
 * the moduleNameMapper "src/.*" → "<rootDir>/src/$1" alias.
 *
 * Required env vars at runtime:
 *   E2E_TEST_MODE=true
 *   MONGODB_URI=<mongo connection string>
 *   RABBITMQ_URL=<amqp url>
 *   RABBITMQ_QUEUE=<queue name>
 */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  // roots must be absolute or relative outside rootDir — use a workaround via testRegex + testPathPattern
  testRegex: "auth-aware\\.e2e\\.spec\\.ts$",
  // Point Jest at the e2e directory as an additional root
  roots: ["<rootDir>", "<rootDir>/../e2e"],
  // Tests live outside rootDir (backend/e2e) and still need producer deps.
  moduleDirectories: ["node_modules", "<rootDir>/node_modules"],
  modulePaths: ["<rootDir>/node_modules"],
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/../e2e/tsconfig.json",
        diagnostics: false,
      },
    ],
  },
  testEnvironment: "node",
  testTimeout: 30000,
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
  },
};
