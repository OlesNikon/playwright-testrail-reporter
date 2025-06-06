/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// eslint-disable-next-line @typescript-eslint/naming-convention
import TestRail from '@dlenroc/testrail';

import logger from '@logger';

jest.mock('@logger', () => ({
    debug: jest.fn()
}));

describe('TestRail API: Basic (Initialize client)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Should initialize client', () => {
        const client = new TestRail({
            host: 'https://testrail.example.com',
            username: 'username',
            password: 'password'
        });
        expect(client).toBeDefined();
    });

    it('Should log a debug message on client initialization', () => {
        process.env.TESTRAIL_REPORTER_DEBUG_MODE = 'true';
        const client = new TestRail({
            host: 'https://testrail.example.com',
            username: 'username',
            password: 'password'
        });
        expect(client).toBeDefined();
        expect(logger.debug).toHaveBeenCalledWith('TestRail API client initialized', {
            baseUrl: 'https://testrail.example.com',
            retries: 3
        });
    });
});