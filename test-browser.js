const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8000');
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  console.log("Clicking sign in");
  await page.click('#nav-login-btn');
  
  await page.waitForTimeout(500);
  
  const modalDisplay = await page.$eval('#auth-modal', el => window.getComputedStyle(el).display);
  const modalOpacity = await page.$eval('#auth-modal', el => window.getComputedStyle(el).opacity);
  const modalClasses = await page.$eval('#auth-modal', el => el.className);
  
  console.log('Modal display:', modalDisplay);
  console.log('Modal opacity:', modalOpacity);
  console.log('Modal classes:', modalClasses);
  
  await browser.close();
})();
 