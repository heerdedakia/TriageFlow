const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://triage-flow-blond.vercel.app';

async function run() {
  const dir = path.join(__dirname, '..', 'docs', 'screenshots');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 820 });

    // 1. Login Page
    console.log('Navigating to login page...');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    
    // Check if redirected to vercel.com
    const url = page.url();
    if (url.includes('vercel.com/login')) {
      console.error('ERROR: Vercel Deployment Protection is still enabled! Please disable it first.');
      await browser.close();
      process.exit(1);
    }

    console.log('Capturing login page...');
    await page.screenshot({ path: path.join(dir, 'login.png') });

    // 2. Perform Login
    console.log('Logging in...');
    await page.type('#email-input', 'pm@triageflow.dev');
    await page.type('#password-input', 'Password123');
    
    console.log('Submitting login form...');
    page.click('button[type="submit"]');

    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
    } catch (e) {
      console.log('Navigation timed out. Checking for login error alerts on the page...');
      const errorText = await page.evaluate(() => {
        const el = document.querySelector('div[role="alert"]');
        return el ? el.textContent : null;
      });
      if (errorText) {
        throw new Error(`Login failed on live Vercel site: "${errorText}". This usually means your Neon database has not been seeded with the demo accounts yet!`);
      } else {
        throw e;
      }
    }

    // 3. PM Dashboard Page
    console.log('Capturing dashboard page...');
    await page.screenshot({ path: path.join(dir, 'dashboard.png') });

    // 4. Guided Wizard Page
    console.log('Navigating to guided report wizard...');
    await page.goto(`${BASE_URL}/issues/new`, { waitUntil: 'networkidle2' });
    console.log('Capturing guided wizard page...');
    await page.screenshot({ path: path.join(dir, 'wizard.png') });

    // 5. Issue Detail Page
    console.log('Navigating to issues list to find an issue...');
    await page.goto(`${BASE_URL}/issues`, { waitUntil: 'networkidle2' });
    
    // Click on the first issue key link (e.g. /issues/CORE-1)
    const issueLinkSelector = 'a[href^="/issues/"]';
    const hasIssues = await page.$(issueLinkSelector);
    if (hasIssues) {
      console.log('Clicking issue link to navigate to detail page...');
      await Promise.all([
        page.click(issueLinkSelector),
        page.waitForNavigation({ waitUntil: 'networkidle2' })
      ]);
      console.log('Capturing issue detail page...');
      await page.screenshot({ path: path.join(dir, 'issue-detail.png') });
    } else {
      console.log('No issues found. Capturing issue search list as fallback...');
      await page.screenshot({ path: path.join(dir, 'issue-detail.png') });
    }

    console.log('All screenshots captured successfully!');
  } catch (err) {
    console.error('\n❌ SCREENSHOT FAILURE:\n', err.message || err);
  } finally {
    await browser.close();
  }
}

run();
