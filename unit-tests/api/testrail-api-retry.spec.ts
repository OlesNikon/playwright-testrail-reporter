/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// eslint-disable-next-line @typescript-eslint/naming-convention
import TestRail from '@dlenroc/testrail';
import axiosMockAdapter from 'axios-mock-adapter';

import logger from '@logger';

jest.mock('@logger', () => ({
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
}));

describe('TestRail API: Retry Logic', () => {
    let mock: axiosMockAdapter;
    let client: TestRail;

    beforeEach(() => {
        jest.clearAllMocks();
        client = new TestRail({
            domain: 'https://fake.testrail.io',
            username: 'username',
            password: 'password'
        });

        // @ts-expect-error private property
        mock = new axiosMockAdapter(client.client);
    });

    afterEach(() => {
        mock.reset();
    });

    it('Should not retry on successful response', async () => {
        mock.onPost('/api/v2/add_run/1').reply(200, { id: 123, name: 'Test Run' });

        const result = await client.addTestRun({
            projectId: 1,
            suiteId: 1,
            name: 'Test Run',
            cases: [],
            includeAllCases: true
        });

        expect(logger.warn).not.toHaveBeenCalled();
        expect(result).toEqual({ id: 123, name: 'Test Run' });
    });

    it('Should log warn all retry attempts', async () => {
        mock.onPost('/api/v2/add_run/1').replyOnce(500)
            .onPost('/api/v2/add_run/1').replyOnce(501)
            .onPost('/api/v2/add_run/1').reply(503);

        await client.addTestRun({
            projectId: 1,
            suiteId: 1,
            name: 'Test Run',
            cases: [],
            includeAllCases: true
        });

        expect(logger.warn).toHaveBeenCalledTimes(3);
        expect(logger.warn).toHaveBeenCalledWith('Retrying request', {
            attempt: 1,
            url: '/api/v2/add_run/1',
            error: 'Request failed with status code 500',
            status: 500
        });
        expect(logger.warn).toHaveBeenCalledWith('Retrying request', {
            attempt: 2,
            url: '/api/v2/add_run/1',
            error: 'Request failed with status code 501',
            status: 501
        });
        expect(logger.warn).toHaveBeenCalledWith('Retrying request', {
            attempt: 3,
            url: '/api/v2/add_run/1',
            error: 'Request failed with status code 503',
            status: 503
        });
    });

    it('Should retry on 5xx error', async () => {
        mock.onPost('/api/v2/add_run/1').reply(500);

        await client.addTestRun({
            projectId: 1,
            suiteId: 1,
            name: 'Test Run',
            cases: [],
            includeAllCases: true
        });

        const error = new Error('Request failed with status code 500');

        expect(logger.warn).toHaveBeenCalledTimes(3);
        expect(logger.error).toHaveBeenCalledWith('Failed to create a test run for project 1 and suite 1', error);
    });

    it('Should return data and not retry if previous request did not fail', async () => {
        mock.onPost('/api/v2/add_run/1')
            .replyOnce(500)
            .onPost('/api/v2/add_run/1')
            .replyOnce(503)
            .onPost('/api/v2/add_run/1')
            .replyOnce(200, { id: 103, name: 'Test Run' });

        const result = await client.addTestRun({
            projectId: 1,
            suiteId: 1,
            name: 'Test Run',
            cases: [],
            includeAllCases: true
        });

        expect(logger.warn).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ id: 103, name: 'Test Run' });
    });

    it('Should retry on network error for idempotent requests', async () => {
        mock.onGet('/api/v2/get_suite/1').networkError();

        await client.getSuiteInfo(1);

        const error = new Error('Network Error');
        expect(logger.warn).toHaveBeenCalledTimes(3);
        expect(logger.error).toHaveBeenCalledWith('Failed to retrieve suite info for suite ID 1', error);
    });
});