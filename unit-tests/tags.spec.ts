import { parseSingleTag, parseTestTags } from '@reporter/utils/tags';

describe('Playwright tags parsing', function () {
    describe('Single tag parsing', function () {
        it('Should parse single simple tag correctly', function () {
            const tag = '111-222-333';
            expect(parseSingleTag(tag)).toEqual({
                projectId: 111,
                suiteId: 222,
                caseId: 333
            });
        });

        it('Should parse a tag with prefix in the case ID', function () {
            const tag = '111-222-C333';
            expect(parseSingleTag(tag)).toEqual({
                projectId: 111,
                suiteId: 222,
                caseId: 333
            });
        });

        it('Should return undefined for empty tag', function () {
            const tag = '';
            expect(parseSingleTag(tag)).toEqual(undefined);
        });

        it('Should return undefined for invalid tag', function () {
            const tag = '111-222-XX333';
            expect(parseSingleTag(tag)).toEqual(undefined);
        });
    });

    describe('Test tags parsing', function () {
        it('Should parse array of a single tag correctly', function () {
            const tags = ['111-222-333'];
            expect(parseTestTags(tags)).toEqual([
                {
                    projectId: 111,
                    suiteId: 222,
                    arrayCaseIds: [333]
                }
            ]);
        });

        it('Should parse two test tags correctly', function () {
            const tags = ['111-222-333', '111-222-444'];
            expect(parseTestTags(tags)).toEqual([
                {
                    projectId: 111,
                    suiteId: 222,
                    arrayCaseIds: [333, 444]
                }
            ]);
        });

        it('Should parse multiple tags from same and different projects and suites correctly', function () {
            const tags = [
                '111-222-C111', '111-222-333', '111-222-4444', '111-222-invalid',
                'invalid',
                '111-333-111', '111-333-444',
                '222-444-555', '222-444-666'
            ];
            expect(parseTestTags(tags)).toEqual([
                {
                    projectId: 111,
                    suiteId: 222,
                    arrayCaseIds: [111, 333, 4444]
                },
                {
                    projectId: 111,
                    suiteId: 333,
                    arrayCaseIds: [111, 444]
                },
                {
                    projectId: 222,
                    suiteId: 444,
                    arrayCaseIds: [555, 666]
                }
            ]);
        });

        it('Should return undefined for empty array', function () {
            expect(parseTestTags([])).toEqual(undefined);
        });
    });
});