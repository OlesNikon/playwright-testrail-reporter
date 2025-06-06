/* eslint-disable @typescript-eslint/naming-convention */
export type TestRailBaseProject = {
    id: number,
    is_completed: boolean,
    name: string,
    show_announcement: boolean,
    suite_mode: number,
    url: string
};

export type TestRailBaseSuite = {
    id: number,
    description: string | null,
    name: string,
    project_id: TestRailBaseProject['id'],
    url: string
};

export type TestRailBaseCase = {
    id: number,
    title: string,
    created_on: number,
    created_by: TestRailBaseUser['id'],
    suite_id: TestRailBaseSuite['id'],
    type_id: number,
    updated_by: TestRailBaseUser['id'],
    updated_on: number
};

export type TestRailBaseRun = {
    id: number,
    name: string,
    created_by: TestRailBaseUser['id'],
    created_on: number,
    include_all: boolean,
    suite_id: TestRailBaseSuite['id'],
    url: string,
    description: string | null
};

export type TestRailBaseResult = {
    id: number,
    comment: string,
    created_by: TestRailBaseUser['id'],
    created_on: number,
    elapsed: string,
    status_id: TestRailCaseStatus,
    test_id: TestRailBaseCase['id'],
    assignedto_id: TestRailBaseUser['id'] | null,
    version: string | null,
    defects: string | null,
    attachment_ids: TestRailBaseAttachment['id'][]
};

export type TestRailBaseUser = {
    id: number,
    email: string,
    is_active: boolean,
    name: string
};

export type TestRailBaseAttachment = {
    id: number
};

export type TestRailPayloadUpdateRunResult = Pick<TestRailBaseResult, 'status_id' | 'comment'> & {
    case_id: TestRailBaseCase['id'],
    assignedto_id?: TestRailBaseUser['id'],
    elapsed?: string,
    environment?: string,
    defects?: string
};

export type TestRailPayloadAddAttachment = {
    resultId: TestRailBaseResult['id'],
    attachment: string
};

// Enums
export enum TestRailCaseStatus {
    passed = 1,
    blocked = 2,
    untested = 3,
    // retest status exists in API but is not used in reporter
    // retest = 4,
    failed = 5,
    // custom status
    skipped = 6
}