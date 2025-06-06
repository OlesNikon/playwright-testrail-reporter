[![npm version](https://badge.fury.io/js/playwright-reporter-testrail.svg)](https://badge.fury.io/js/playwright-reporter-testrail)

# Playwright TestRail Reporter with Multi-Project Support

A Playwright reporter that integrates with TestRail via API and supports multiple projects and test suites.  

This reporter automatically creates test runs and updates test results in TestRail based on your Playwright test execution.

### Key Features

- 🔄 Multi-project and multi-suite support
- 🏷️ Test case mapping via tags
- 🪜 Tagged test steps support
- 📊 Automatic test run creation and updating
- 🔍 Comprehensive error reporting
- 📝 Automatic run closing (optional)
- 🖼️ Attachment support (optional)

## Setup

### Installation

```bash
npm install --save-dev playwright-reporter-testrail
```

### Playwright Setup

1. Get your TestRail credentials:
   - Domain (e.g., `https://yourdomain.testrail.io`)
   - Email
   - Password or API Key

2. Configure the reporter in your `playwright.config.ts`:

```typescript
import { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  reporter: [
    ['playwright-reporter-testrail', {
      domain: 'https://yourdomain.testrail.io',
      username: 'your-email',
      password: 'your-password',
      includeAllCases: false,
      includeAttachments: false,
      closeRuns: false,
      apiChunkSize: 10,
      runNameTemplate: 'Playwright Run #{date}'
    }]
  ]
};

export default config;
```

Reporter options:

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `domain` | `string` | Required | TestRail domain URL |
| `username` | `string` | Required | TestRail email |
| `password` | `string` | Required | TestRail password or API key |
| `includeAllCases` | `boolean` | `false` | Whether to include all cases of the TestRail suite to the test run |
| `includeAttachments` | `boolean` | `false` | Whether to upload attachments for the test run.<br>Note: May result in longer execution time as each attachment requires a separate API call |
| `closeRuns` | `boolean` | `false` | Whether to close test runs in the end.<br>Note: Ensure user has permissions to close runs in TestRail |
| `apiChunkSize` | `number` | `10` | The number of requests to send in parallel to TestRail API |
| `runNameTemplate` | `string` | `Playwright Run #{date}` | Template for the test run name.<br>Supports variables:<br>• `#{date}`: Current date/time in `YYYY/MM/DD HH:MM:SS UTC` format<br>• `#{timestamp}`: Current timestamp in milliseconds<br>• `#{suite}`: Test suite name (increases execution time as it requires additional API call per each test run) |

## Usage

### Tagging Tests

Tag your tests with TestRail case IDs using the following format:
- `@<project_id>-<suite_id>-<case_id>`

Where:
- `project_id`: TestRail project ID
- `suite_id`: TestRail test suite ID
- `case_id`: TestRail test case ID (might include prefix)

Example:

```typescript
import { test } from '@playwright/test';

test('simple test matching one case', { tag: ['@101-204-R3453'] }, async ({ page }) => {
  // Your test code
});

// Multiple test cases
test('complex feature with multiple cases from multiple projects', { tag: ['@101-204-3453', '@203-305-4567'] }, async ({ page }) => {
  // Your test code
});
```

### Tagging Test Steps

Tagging test steps is optional, but is recommended for long E2E tests.

Tag your test step titles with TestRail case ID (might include prefix) with `@`. Test step might contain multiple case IDs.

Example
```typescript
import { test } from '@playwright/test';

test('simple test matching three cases', { tag: ['@101-204-555', '@101-204-556', '@101-204-557'] }, async ({ page }) => {
  await test.step('Step 1 @555', async () => {
    // Your step code
  });

  await test.step('Step 2 @556 @R557', async () => {
    // Your step code
  });
});
```

#### Rules Regarding Tagged Steps

The main benefit of using tagged steps is for longer E2E tests to correctly mark passed steps in TestRail if the test fails on a later stage in Playwright.

- If a test contains some valid tags, tagged steps should use the same case IDs. Otherwise, the reporter will log an error and ignore those steps
- If a step does not contain a valid TestRail case ID, it will be ignored by reporter
- If a step contains a valid TestRail case ID and it passes, the corresponding TestRail case will be marked as passed regardless of the result of the whole test execution
- If a step contains a valid TestRail case ID and it fails, the corresponding TestRail case will get the same status and comment as if steps was not tagged

Avoid situation where all test tags are matched to test steps, but some steps are not tagged. If such situation occurs and the test fails, the reporter might miss the failed step and mark the test as passed in TestRail. Consider either adding tags to all steps or make sure that some tags are not matched to test steps.

#### ❌ Incorrect usage:

```typescript
import { test } from '@playwright/test';

test('simple test matching one case', { tag: ['@101-204-555'] }, async ({ page }) => {
  await test.step('Step 1 @555', async () => {
    // This step will be marked as passed in TestRail
  });

  await test.step('Step 2', async () => {
    throw new Error('TestRail will not know about this failure')
  });
});
```

### Running Tests

Run your Playwright tests as usual:

```bash
npx playwright test
```

Your test results will be automatically sent to TestRail.

### Logging

If you want to have more detailed logs, consider setting `TESTRAIL_REPORTER_DEBUG_MODE` environment variable to `true`.

## Additional Information

#### Graceful Failure Logic

The reporter logs errors to the console if it is not configured correctly or if any API calls fail. It does not throw errors and allows test execution to continue.

#### Creating and Updating Test Runs

TestRail test runs are created after all tests finish their execution. If Playwright run results in a timeout or interrupted statuses, test runs are not created.

#### API Retry Logic

The reporter will retry the API calls up to 3 times if the API call fails with a 5xx status code.

#### Multiple Playwright Tests Matching One TestRail Case

If you have multiple Playwright tests that match the same TestRail case, the reporter will abide by the following rules:

1. If all Playwright tests finish with the same status, the TestRail case will be marked with that status, and the comment (and error in case of fail) will be generated from the first test that finished.
2. If any Playwright tests finish with different statuses, the reporter will prioritize the following statuses in order: passed, failed, blocked, untested.


### Enhanced Features (new)
- 🚀 **@dlenroc/testrail Integration** - Uses the official TestRail API client for better reliability
- 📊 **Multiple Run URLs** - Properly handles and exposes URLs for all created runs
- 🏷️ **Flexible Tag Formats** - Support for shortened tags with default project/suite IDs
- 🎯 **Use Existing Runs** - Report to existing TestRail runs

## Configuration

### Basic Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['enhanced-testrail-reporter', {
      // Required
      domain: 'https://yourdomain.testrail.io',
      username: 'your-email@example.com',
      password: 'your-password',
    }]
  ]
});
```

### Full Configuration Options

```typescript
export default defineConfig({
  reporter: [
    ['enhanced-testrail-reporter', {
      // Required
      domain: 'https://yourdomain.testrail.io',
      username: 'your-email@example.com',
      password: 'your-password',
      
      // Project and Suite Defaults (Enhanced)
      defaultProjectId: 1,              // Default project for shortened tags
      defaultSuiteId: 2,                // Default suite for shortened tags
      
      // Run Management (Enhanced)
      useExistingRun: 123,              // Report to existing run ID
      
      // Original Options
      runNameTemplate: 'Playwright Run {date}', // Template for run names
      includeAllCases: false,           // Include all cases in run
      includeAttachments: true,         // Attach screenshots/videos
      closeRuns: false,                 // Close runs after completion
      apiChunkSize: 10,                 // API batch size
    }]
  ]
});
```

## Usage

### Basic Test Tagging

```typescript
import { test } from '@playwright/test';

// Single test case
test('should login successfully', { tag: '@123-456-789' }, async ({ page }) => {
  // Test implementation
});

// Multiple test cases
test('should handle multiple scenarios', { 
  tag: ['@123-456-789', '@123-456-790'] 
}, async ({ page }) => {
  // Test implementation
});
```

### Tagged Test Steps

```typescript
test('multi-step process', { tag: ['@C101', '@C102', '@C103', '@C104'] }, async ({ page }) => {
  await test.step('Login @101', async () => {
    // This step result will be reported to case 101
  });
  
  await test.step('Navigate @102', async () => {
    // This step result will be reported to case 102
  });
  
  await test.step('Submit form @103 @104', async () => {
    // This step result will be reported to cases 103 and 104
  });
});
```

## Tag Formats

The enhanced reporter supports three tag formats:

### 1. Full Format (Original)
```typescript
test('test name', { tag: '@123-456-789' }, async ({ page }) => {
  // Project: 123, Suite: 456, Case: 789
});
```

### 2. Suite-Case Format (Enhanced)
Requires `defaultProjectId` to be set:
```typescript
test('test name', { tag: '@S456-789' }, async ({ page }) => {
  // Project: defaultProjectId, Suite: 456, Case: 789
});
```

### 3. Case-Only Format (Enhanced)
Requires both `defaultProjectId` and `defaultSuiteId` to be set:
```typescript
test('test name', { tag: '@C789' }, async ({ page }) => {
  // Project: defaultProjectId, Suite: defaultSuiteId, Case: 789
});
```

### Tag Variations
All formats support the TestRail 'R' prefix:
```typescript
{ tag: '@123-456-R789' }  // Full format with R
{ tag: '@S456-R789' }     // Suite format with R
{ tag: '@C789' }          // Case format (R not needed)
```

#### Known Issues

When several Playwright tests match the same TestRail case, each test will upload its attachments to the TestRail case. This may result in duplicate attachments.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details
