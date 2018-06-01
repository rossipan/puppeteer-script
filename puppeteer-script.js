#!/usr/bin/env node

'use strict';

const USAGE = `
    Usage:
        ./puppeteer-script.js <url>
    Dependencies:
        npm i puppeteer
`

const puppeteer = require('puppeteer');
const [url] = process.argv.slice(2);

function log(text) {
    process.stderr.write(`${text}\n`)
    process.exit(0);
}

// if run from CLI instead of being imported
if (require.main === module) {
    const node_version = Number(process.version.split('.')[0].slice(1))
    if (node_version < 8) {
        log('[X] You need node version >= 8.0.0 to run this.')
        process.exit(1)
    }
    if (process.argv.includes('--help') || process.argv.includes('-h') || !url ) {
        log(USAGE)
    }
}

console.log('loading:', url);
(async () => {
    const savedEnv = Object.assign({}, process.env);
    process.env.TZ = 'America/Los_Angeles';
//    const browser = await puppeteer.launch({args: ['--no-sandbox', '--remote-debugging-address=0.0.0.0', '--remote-debugging-port=9222']});
    const browser = await puppeteer.launch({args: ['--no-sandbox']});
    const page = await browser.newPage();
    page.on('console', msg => {
        console.log('PAGE LOG:', msg.text);
    });
    page.on('response', response => {
        if (response.status >= 400) {
            console.log('#ResourceError:', response.status, response.url);
        }
    });
    page.on('pageerror', error => {
        console.log('#JavaScriptExecution:', error.message);
    });
    page.on('requestfailed', request => {
        console.log('#FAIL to load the address:',request.failure().errorText, request.url);
        process.exit(1);
    });
    process.on('unhandledRejection', function(e) {
        console.error('#FAIL to load the address:', e.message);
        process.exit(1);
    });
    await page.goto(url);
    await page.waitFor(5000);

    // fetch First Paint  & First Contentful Paint
    // https://www.chromestatus.com/feature/5688621814251520
    const paints = await page.evaluate(_ => {
        const result = {};
        performance.getEntriesByType('paint').map(entry => {
        //performance.getEntries().map(entry => {
            result[entry.name] = entry.startTime;
        });
        return result;
    });
    for (const [key, val] of Object.entries(paints)) {
        console.log(`${key}: ${Math.round(val)}ms`);
    }

    await browser.close();
})();
