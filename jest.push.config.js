module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", { tsconfig: { module: "commonjs", moduleResolution: "node", esModuleInterop: true, jsx: "react-jsx", strict: true } }],
  },
};
