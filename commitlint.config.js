// Commitlint Configuration
// Mustard Seed Networks - The Stem
//
// Enforces conventional commit format:
// <type>(<scope>): <subject>

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Type must be one of the following
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation
        "style", // Formatting, missing semicolons, etc.
        "refactor", // Refactoring code
        "perf", // Performance improvement
        "test", // Adding tests
        "build", // Build system or external dependencies
        "ci", // CI configuration
        "chore", // Maintenance tasks
        "revert", // Reverting changes
      ],
    ],
    // Subject must not be empty
    "subject-empty": [2, "never"],
    // Type must not be empty
    "type-empty": [2, "never"],
    // Subject must start with lowercase
    "subject-case": [2, "always", "lower-case"],
    // Max header length
    "header-max-length": [2, "always", 100],
  },
};
