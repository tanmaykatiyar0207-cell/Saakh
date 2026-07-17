const { chromium } = require('playwright');

(async () => {
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log('[BROWSER ERROR]:', err.message);
  });

  console.log("Navigating to http://localhost:8080/index.html...");
  await page.goto('http://localhost:8080/index.html');

  console.log("Triggering login modal...");
  await page.click('#nav-login-btn');
  await page.waitForTimeout(500);

  console.log("Filling login credentials...");
  await page.fill('#auth-email', 'testuser@saakh.com');
  await page.fill('#auth-password', 'password123');

  console.log("Submitting login form...");
  await page.click('#auth-submit-btn');

  await page.waitForTimeout(3000);
  console.log("Current URL after submit:", page.url());

  await browser.close();
  console.log("Done.");
})();
