import { expect, test } from '@playwright/test';

const project0Id = '110';
const project0suite0Id = '374';
const project0suite0test0Id = '13082';

const project1Id = '111';
const project1suite0Id = '375';
const project1suite0test0Id = '13083';
const project1suite0test1Id = '13084';

test('Single passing tag', { tag: [`@${project0Id}-${project0suite0Id}-${project0suite0test0Id}`] }, async ({ page }) => {
    await page.goto('https://playwright.dev');
});

test('Single tag failing test', { tag: [`@${project1Id}-${project1suite0Id}-${project1suite0test0Id}`] }, async ({ page }) => {
    await page.goto('https://playwright.dev');
    await expect(page).toHaveTitle('Will Fail');
});

test('Single tag with prefix', { tag: [`@${project1Id}-${project1suite0Id}-R${project1suite0test1Id}`] }, async ({ page }) => {
    await page.goto('https://playwright.dev');
});