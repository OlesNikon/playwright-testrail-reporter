import { groupTestResults } from '@reporter/utils/group-runs';

import { RunCreated } from '@types-internal/playwright-reporter.types';
import { TestRailCaseResult, TestRailCaseStatus } from '@types-internal/testrail-api.types';

describe('Group runs unit tests', function () {
    it('Should handle empty runs and results', function () {
        const arrayTestResults: TestRailCaseResult[] = [];
        const arrayTestRuns: RunCreated[] = [];

        expect(groupTestResults(arrayTestResults, arrayTestRuns)).toEqual([]);
    });

    it('Should group test results by runs correctly', function () {
        const arrayTestResults: TestRailCaseResult[] = [
            { case_id: 1, status_id: TestRailCaseStatus.passed, comment: 'Test 1' },
            { case_id: 2, status_id: TestRailCaseStatus.failed, comment: 'Test 2' },
            { case_id: 3, status_id: TestRailCaseStatus.blocked, comment: 'Test 3' },
            { case_id: 4, status_id: TestRailCaseStatus.untested, comment: 'Test 4' }
        ];

        const arrayTestRuns: RunCreated[] = [
            { projectId: 10, suiteId: 100, runId: 1000, arrayCaseIds: [1, 2] },
            { projectId: 20, suiteId: 200, runId: 2000, arrayCaseIds: [2, 3, 4] },
            { projectId: 30, suiteId: 300, runId: 3000, arrayCaseIds: [3, 4] }
        ];

        expect(groupTestResults(arrayTestResults, arrayTestRuns)).toEqual([
            {
                runId: 1000,
                arrayCaseResults: [
                    { case_id: 1, status_id: TestRailCaseStatus.passed, comment: 'Test 1' },
                    { case_id: 2, status_id: TestRailCaseStatus.failed, comment: 'Test 2' }
                ]
            },
            {
                runId: 2000,
                arrayCaseResults: [
                    { case_id: 2, status_id: TestRailCaseStatus.failed, comment: 'Test 2' },
                    { case_id: 3, status_id: TestRailCaseStatus.blocked, comment: 'Test 3' },
                    { case_id: 4, status_id: TestRailCaseStatus.untested, comment: 'Test 4' }
                ]
            },
            {
                runId: 3000,
                arrayCaseResults: [
                    { case_id: 3, status_id: TestRailCaseStatus.blocked, comment: 'Test 3' },
                    { case_id: 4, status_id: TestRailCaseStatus.untested, comment: 'Test 4' }
                ]
            }
        ]);
    });

    it('Should handle runs with no matching results', function () {
        const arrayTestResults: TestRailCaseResult[] = [
            { case_id: 1, status_id: TestRailCaseStatus.passed, comment: 'Test 1' }
        ];

        const arrayTestRuns: RunCreated[] = [
            { projectId: 10, suiteId: 100, runId: 1000, arrayCaseIds: [2] }
        ];

        expect(groupTestResults(arrayTestResults, arrayTestRuns)).toEqual([
            {
                runId: 1000,
                arrayCaseResults: []
            }
        ]);
    });

    it('Should handle results with no matching runs', function () {
        const arrayTestResults: TestRailCaseResult[] = [
            { case_id: 1, status_id: TestRailCaseStatus.passed, comment: 'Test 1' }
        ];

        const arrayTestRuns: RunCreated[] = [];

        expect(groupTestResults(arrayTestResults, arrayTestRuns)).toEqual([]);
    });
});