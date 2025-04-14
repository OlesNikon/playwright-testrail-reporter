import type { FinalResult, RunCreated } from '@types-internal/playwright-reporter.types';
import type { TestRailCaseResult } from '@types-internal/testrail-api.types';

/**
 * Groups test results by test runs based on case IDs.
 * @param arrayTestResults Array of TestRail case results containing status and comments
 * @param arrayTestRuns Array of created test runs with project, suite, and case IDs
 * @returns Array of final results, where each result contains:
 * - runId: ID of the TestRail run
 * - arrayCaseResults: Array of case results that belong to this run
 */
export function groupTestResults(arrayTestResults: TestRailCaseResult[], arrayTestRuns: RunCreated[]): FinalResult[] {
    return arrayTestRuns.map((run) => {
        const arrayCaseResults = arrayTestResults.filter((result) => {
            return run.arrayCaseIds.includes(result.case_id);
        });

        return {
            runId: run.runId,
            arrayCaseResults
        };
    });
}