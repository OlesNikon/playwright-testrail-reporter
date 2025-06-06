/* eslint-disable max-params */
import type { TestCase } from '@playwright/test/reporter';

import type { ParsedTag, ProjectSuiteCombo } from '@types-internal/playwright-reporter.types';

export const REGEX_TAG_TEST = /(\d+)-(\d+)-\D?(\d+)/;
export const REGEX_TAG_SUITE_CASE = /S(\d+)-\D?(\d+)/;
export const REGEX_TAG_CASE_ONLY = /C(\d+)/;
export const REGEX_TAG_STEP = /@\D?(\d+)/g;

/**
 * Parses a single TestRail tag with support for default project and suite IDs
 * Supports formats:
 * - "123-456-789" or "123-456-R789" (full format)
 * - "S456-789" or "S456-R789" (suite-case format, uses default project)
 * - "C789" (case-only format, uses default project and suite)
 * @param tag - A tag string from Playwright test case tags
 * @param defaultProjectId - Default project ID to use when not specified in tag
 * @param defaultSuiteId - Default suite ID to use when not specified in tag
 * @returns ParsedTag object containing projectId, suiteId, and caseId if the tag matches the expected format,
 *          null otherwise
 */
export function parseSingleTag(
    tag: TestCase['tags'][number],
    defaultProjectId?: number,
    defaultSuiteId?: number
): ParsedTag | null {
    // Try full format first: 123-456-789 or 123-456-R789
    let match = REGEX_TAG_TEST.exec(tag);
    if (match) {
        return {
            projectId: Number(match[1]),
            suiteId: Number(match[2]),
            caseId: Number(match[3])
        };
    }

    // Try suite-case format: S456-789 or S456-R789
    match = REGEX_TAG_SUITE_CASE.exec(tag);
    if (match && defaultProjectId) {
        return {
            projectId: defaultProjectId,
            suiteId: Number(match[1]),
            caseId: Number(match[2])
        };
    }

    // Try case-only format: C789
    match = REGEX_TAG_CASE_ONLY.exec(tag);
    if (match && defaultProjectId && defaultSuiteId) {
        return {
            projectId: defaultProjectId,
            suiteId: defaultSuiteId,
            caseId: Number(match[1])
        };
    }

    return null;
}

/**
 * Parses an array of TestRail tags and groups them by project and suite. Handles duplicate case IDs by including them only once.
 * @param tags - An array of tag strings from Playwright test case tags
 * @param defaultProjectId - Default project ID to use when not specified in tag
 * @param defaultSuiteId - Default suite ID to use when not specified in tag
 * @returns An array of ProjectSuiteCombo objects, each containing projectId, suiteId, and an array of unique caseIds
 *          if at least one tag matches the expected format, null otherwise
 */
export function parseArrayOfTags(
    tags: TestCase['tags'],
    defaultProjectId?: number,
    defaultSuiteId?: number
): ProjectSuiteCombo[] | null {
    const arrayParsedValidTags = tags
        .map((tag) => parseSingleTag(tag, defaultProjectId, defaultSuiteId))
        .filter((parsedTag) => parsedTag !== null);

    if (arrayParsedValidTags.length === 0) {
        return null;
    }

    const groupedResults = new Map<string, ProjectSuiteCombo>();

    for (const parsedTag of arrayParsedValidTags) {
        const key = `${parsedTag.projectId}-${parsedTag.suiteId}`;
        const existingGroup = groupedResults.get(key);

        /*
                Create new group if it doesn't exist
                Add case ID to the existing group if case ID is not already included
            */
        if (!existingGroup) {
            groupedResults.set(key, {
                projectId: parsedTag.projectId,
                suiteId: parsedTag.suiteId,
                arrayCaseIds: [parsedTag.caseId]
            });
        } else if (!existingGroup.arrayCaseIds.includes(parsedTag.caseId)) {
            existingGroup.arrayCaseIds.push(parsedTag.caseId);
        }
    }

    return Array.from(groupedResults.values());
}