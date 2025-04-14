# playwright-testrail-reporter

A Playwright reporter that integrates with TestRail, supporting multiple projects and test suites. This reporter automatically creates test runs and updates test results in TestRail based on your Playwright test execution.

## Features

- 🔄 Multi-project and multi-suite support
- 🏷️ Test case mapping via tags
- 📊 Automatic test run creation
- ⚡ Parallel execution support
- 🔍 Comprehensive error reporting

## Installation

```bash
npm install --save-dev playwright-testrail-reporter
```

## Configuration

### TestRail Setup

1. Get your TestRail credentials:
   - Domain (e.g., `https://yourdomain.testrail.io`)
   - Username/Email
   - Password or API Key

2. Configure the reporter in your `playwright.config.ts`:

```typescript
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  reporter: [
    ['playwright-testrail-reporter', {
      domain: 'https://yourdomain.testrail.io',
      username: 'your-username',
      password: 'your-password'
    }]
  ]
};

export default config;
```

## Usage

### Tagging Tests

Tag your tests with TestRail case IDs using the following format:
- `@<project_id>-<suite_id>-<case_id>`

Where:
- `project_id`: TestRail project ID
- `suite_id`: TestRail test suite ID
- `case_id`: TestRail test case ID

Example:

```typescript
import { test } from '@playwright/test';

test('simple test matching one case', { tag: ['@101-204-3453'] }, async ({ page }) => {
  // Your test code
});

// Multiple test cases
test('complex feature with multiple cases from multiple projects', { tag: ['@101-204-3453', '@203-305-4567'] }, async ({ page }) => {
  // Your test code
});
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details
