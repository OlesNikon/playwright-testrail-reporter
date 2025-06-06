/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import fs from 'fs';

// eslint-disable-next-line @typescript-eslint/naming-convention
import TestRail from '@dlenroc/testrail';
import type {
    FullConfig, FullResult, Reporter, Suite, TestCase, TestResult
} from '@playwright/test/reporter';

import { resolvePromisesInChunks } from '@reporter/utils/chunk-promise';
import { formatTestRunName, TEMPLATE_DATE, TEMPLATE_SUITE } from '@reporter/utils/format-run-name';
import { filterDuplicatingCases, groupAttachments, groupTestResults } from '@reporter/utils/group-runs';
import { parseArrayOfTags } from '@reporter/utils/tags';
import { convertTestResult, extractAttachmentData } from '@reporter/utils/test-results';
import { validateSettings } from '@reporter/utils/validate-settings';

import type { AttachmentData, CaseResultMatch, FinalResult, ProjectSuiteCombo, ReporterOptions, RunCreated } from '@types-internal/playwright-reporter.types';
import type { TestRailBaseSuite, TestRailPayloadUpdateRunResult } from '@types-internal/testrail-api.types';

import logger from '@logger';

class TestRailReporter implements Reporter {
    private readonly testRailClient: TestRail;

    private readonly isSetupCorrectly: boolean = false;

    private arrayTestRuns: ProjectSuiteCombo[] | null;
    private readonly arrayTestResults: TestRailPayloadUpdateRunResult[];
    private readonly arrayAttachments: AttachmentData[];

    private readonly includeAllCases: boolean;
    private readonly includeAttachments: boolean;
    private readonly closeRuns: boolean;
    private readonly chunkSize: number;
    private readonly runNameTemplate: string;
    private readonly defaultProjectId?: number;
    private readonly defaultSuiteId?: number;
    private readonly useExistingRun?: number;

    private runUrl: string | null = null;
    private runUrls = new Map<string, string>();
    private runIds = new Map<string, number>();

    private readonly defaultSettings = {
        includeAllCases: false,
        includeAttachments: false,
        closeRuns: false,
        apiChunkSize: 10,
        runNameTemplate: `Playwright Run ${TEMPLATE_DATE}`
    };

    constructor(options: ReporterOptions) {
        this.isSetupCorrectly = validateSettings(options);
        logger.debug('Setting up TestRail API client');

        this.testRailClient = new TestRail({
            host: options.domain,
            username: options.username,
            password: options.password
        });

        this.arrayTestResults = [];
        this.arrayAttachments = [];
        this.arrayTestRuns = null;

        // Remember reporter options as 'options' object is not accessible after constructor
        this.includeAllCases = options.includeAllCases ?? this.defaultSettings.includeAllCases;
        this.includeAttachments = options.includeAttachments ?? this.defaultSettings.includeAttachments;
        this.closeRuns = options.closeRuns ?? this.defaultSettings.closeRuns;
        this.chunkSize = options.apiChunkSize ?? this.defaultSettings.apiChunkSize;
        this.runNameTemplate = options.runNameTemplate ?? this.defaultSettings.runNameTemplate;
        this.defaultProjectId = options.defaultProjectId;
        this.defaultSuiteId = options.defaultSuiteId;
        this.useExistingRun = options.useExistingRun;

        logger.debug('Reporter options', {
            includeAllCases: this.includeAllCases,
            includeAttachments: this.includeAttachments,
            closeRuns: this.closeRuns,
            chunkSize: this.chunkSize,
            runNameTemplate: this.runNameTemplate,
            defaultProjectId: this.defaultProjectId,
            defaultSuiteId: this.defaultSuiteId,
            useExistingRun: this.useExistingRun
        });
    }

    onBegin(_config: FullConfig, suite: Suite): void {
        this.arrayTestRuns = parseArrayOfTags(
            suite.allTests().map((test) => test.tags).flat(),
            this.defaultProjectId,
            this.defaultSuiteId
        );
        logger.debug('Runs to create', this.arrayTestRuns);

        if (!this.arrayTestRuns) {
            logger.warn('No tags in expected format found, no test runs will be created');
        }
    }

    onTestEnd(testCase: TestCase, testResult: TestResult): void {
        logger.debug(`Test "${testCase.title}" finished with ${testResult.status} status`);
        this.arrayTestResults.push(...convertTestResult({
            testCase,
            testResult,
            defaultProjectId: this.defaultProjectId,
            defaultSuiteId: this.defaultSuiteId
        }));
        this.arrayAttachments.push(...extractAttachmentData({
            testCase,
            testResult,
            defaultProjectId: this.defaultProjectId,
            defaultSuiteId: this.defaultSuiteId
        }));
    }

    async onEnd(result: FullResult): Promise<void> {
        if (!this.shouldCreateRuns(result)) {
            return;
        }

        let arrayTestRunsCreated: RunCreated[];

        if (this.useExistingRun) {
            arrayTestRunsCreated = await this.useExistingTestRun();
        } else {
            arrayTestRunsCreated = await this.createTestRuns(this.arrayTestRuns!);
        }

        const finalResults = this.compileFinalResults(this.arrayTestResults, arrayTestRunsCreated);
        logger.debug('Test runs to update', finalResults);

        if (finalResults.length === 0) {
            logger.warn('No test runs to update');
            return;
        }

        const arrayRunsUpdated = await this.addResultsToRuns(finalResults);

        if (this.includeAttachments) {
            await this.addAttachments(this.arrayAttachments, arrayRunsUpdated);
        }

        if (this.closeRuns && !this.useExistingRun) {
            await this.closeTestRuns(finalResults.map((finalResult) => finalResult.runId));
        }

        const finalMessage = this.closeRuns && !this.useExistingRun
            ? 'All test runs have been updated and closed ✅'
            : 'All test runs have been updated ✅';

        logger.info(finalMessage);

        if (this.runUrls.size > 0) {
            logger.info('TestRail Run URLs:');
            this.runUrls.forEach((url, key) => {
                const [projectId, suiteId] = key.split('-');
                logger.info(`  Project ${projectId}, Suite ${suiteId}: ${url}`);
            });
        }
    }

    private shouldCreateRuns(result: FullResult): boolean {
        if (!this.isSetupCorrectly) {
            logger.error('Reporter options are not valid, no test runs will be created');
            return false;
        }

        if (result.status === 'interrupted') {
            logger.warn('Test run was interrupted, no test runs will be created');
            return false;
        }

        if (result.status === 'timedout') {
            logger.warn('Test run was timed out, no test runs will be created');
            return false;
        }

        if (!this.arrayTestRuns && !this.useExistingRun) {
            logger.warn('No test runs to create due to absence of tags in expected format');
            return false;
        }

        return true;
    }

    private async getSuiteName(suiteId: TestRailBaseSuite['id']): Promise<string | undefined> {
        return this.runNameTemplate.includes(TEMPLATE_SUITE)
            ? (await this.testRailClient.getSuite(suiteId))?.name
            : undefined;
    }

    private async useExistingTestRun(): Promise<RunCreated[]> {
        if (!this.useExistingRun) {
            return [];
        }

        logger.info(`Using existing test run ${this.useExistingRun}... ⌛`);

        try {
            const run = await this.testRailClient.getRun(this.useExistingRun);

            if (!run) {
                logger.error(`Test run ${this.useExistingRun} not found`);
                return [];
            }

            const runUrl = run.url;
            this.runUrl = runUrl;
            this.runUrls.set(`${run.project_id}-${run.suite_id}`, runUrl);
            this.runIds.set(`${run.project_id}-${run.suite_id}`, this.useExistingRun);

            const tests = await this.testRailClient.getTests(this.useExistingRun);
            const caseIds = tests.map((test) => test.case_id);

            return [{
                runId: this.useExistingRun,
                projectId: run.project_id,
                suiteId: run.suite_id,
                arrayCaseIds: caseIds
            }];
        } catch (error) {
            logger.error(`Failed to get existing test run ${this.useExistingRun}`, error);
            return [];
        }
    }

    private async createTestRuns(arrayTestRuns: ProjectSuiteCombo[]): Promise<RunCreated[]> {
        logger.debug('Runs to create', arrayTestRuns);

        const results = await resolvePromisesInChunks({
            arrayInputData: arrayTestRuns,
            chunkSize: this.chunkSize,
            functionToCall: async (projectSuiteCombo) => {
                logger.info(`Creating a test run for project ${projectSuiteCombo.projectId} and suite ${projectSuiteCombo.suiteId}... ⌛`);
                const key = `${projectSuiteCombo.projectId}-${projectSuiteCombo.suiteId}`;
                const suiteName = await this.getSuiteName(projectSuiteCombo.suiteId);

                const name = formatTestRunName(this.runNameTemplate, suiteName);
                const response = await this.testRailClient.addRun(projectSuiteCombo.projectId, {
                    suite_id: projectSuiteCombo.suiteId,
                    name,
                    case_ids: projectSuiteCombo.arrayCaseIds,
                    include_all: this.includeAllCases
                });

                if (response === null) {
                    return null;
                }

                const runUrl = response.url;
                this.runUrls.set(key, runUrl);
                this.runIds.set(key, response.id);

                this.runUrl ??= runUrl;

                return {
                    runId: response.id,
                    ...projectSuiteCombo
                };
            }
        });

        logger.debug('Runs created', results);

        return results;
    }

    private compileFinalResults(arrayTestResults: TestRailPayloadUpdateRunResult[], arrayTestRuns: RunCreated[]): FinalResult[] {
        const arrayAllResults = groupTestResults(arrayTestResults, arrayTestRuns);
        return arrayAllResults.map((finalResult) => filterDuplicatingCases(finalResult));
    }

    private cleanElapsedTime(elapsed?: string): string | undefined {
        if (!elapsed || elapsed === '0' || elapsed === '0s') {
            return undefined;
        }
        return elapsed;
    }

    private async addResultsToRuns(arrayTestRuns: FinalResult[]): Promise<CaseResultMatch[]> {
        logger.debug(`Adding results to runs ${arrayTestRuns.map((run) => run.runId).join(', ')}`);

        const results = await resolvePromisesInChunks({
            arrayInputData: arrayTestRuns,
            chunkSize: this.chunkSize,
            functionToCall: async (run) => {
                logger.info(`Adding results to run ${run.runId}... ⌛`);

                const cleanedResults = run.arrayCaseResults.map((result) => {
                    const cleanedElapsed = this.cleanElapsedTime(result.elapsed);
                    if (cleanedElapsed === undefined) {
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        const { elapsed, ...resultWithoutElapsed } = result;
                        return resultWithoutElapsed;
                    }
                    return result;
                });

                const result = await this.testRailClient.addResultsForCases(run.runId, {
                    results: cleanedResults
                });

                if (result === null) {
                    return null;
                }

                if (result.length !== run.arrayCaseResults.length) {
                    logger.error(`Number of results does not match number of cases when updating test run ${run.runId}`);
                    return null;
                }

                // Match request payload to response by index
                return run.arrayCaseResults.map((caseResult, index) => ({
                    caseId: caseResult.case_id,
                    resultId: result[index].id
                }));
            }
        });

        return results.flat();
    }

    private async addAttachments(arrayAttachments: AttachmentData[], arrayRunsUpdated: CaseResultMatch[]): Promise<void> {
        const arrayAttachmentPayloads = groupAttachments(arrayAttachments, arrayRunsUpdated);

        if (arrayAttachmentPayloads.length === 0) {
            logger.info('No attachments to add');
            return;
        }

        logger.info(`Adding attachments to results ${arrayAttachmentPayloads.map((payload) => payload.resultId).join(', ')}... ⌛`);

        await resolvePromisesInChunks({
            arrayInputData: arrayAttachmentPayloads,
            // eslint-disable-next-line @typescript-eslint/require-await
            functionToCall: async (payload) => {
                try {
                    const fileContent = fs.createReadStream(payload.attachment);
                    const fileName = payload.attachment.split('/').pop() ?? 'attachment';

                    return this.testRailClient.addAttachmentToResult(payload.resultId, {
                        name: fileName,
                        value: fileContent
                    });
                } catch (error) {
                    logger.error(`Failed to add attachment ${payload.attachment} to result ${payload.resultId}:`, error);
                    return null;
                }
            },
            chunkSize: this.chunkSize
        });
    }

    private async closeTestRuns(arrayRunIds: number[]): Promise<void> {
        logger.info(`Closing runs ${arrayRunIds.join(', ')}... ⌛`);
        await resolvePromisesInChunks({
            arrayInputData: arrayRunIds,
            functionToCall: (runId) => this.testRailClient.closeRun(runId),
            chunkSize: this.chunkSize
        });
    }

    printsToStdio(): boolean {
        return true;
    }

    getRunUrl(): string | null {
        return this.runUrl;
    }

    getRunUrls(): Map<string, string> {
        return new Map(this.runUrls);
    }

    getRunMetadata(): {
        projectId: number,
        suiteId: number,
        runId: number,
        url: string
    }[] {
        const metadata: {
            projectId: number,
            suiteId: number,
            runId: number,
            url: string
        }[] = [];

        this.runUrls.forEach((url, key) => {
            const [projectId, suiteId] = key.split('-').map(Number);
            const runId = this.runIds.get(key);
            if (runId) {
                metadata.push({
                    projectId,
                    suiteId,
                    runId,
                    url
                });
            }
        });

        return metadata;
    }
}

export default TestRailReporter;