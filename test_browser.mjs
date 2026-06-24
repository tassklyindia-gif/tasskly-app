import { chromium } from '@playwright/test';

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] [${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[BROWSER ERROR] ${err.message}\n${err.stack}`);
  });

  console.log("Navigating to http://localhost:8080/ ...");
  try {
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle', timeout: 10000 });
    console.log("On homepage. Setting tasskly_otp_verified to true...");
    
    // Set OTP verified in localStorage
    await page.evaluate(() => {
      localStorage.setItem('tasskly_otp_verified', 'true');
    });

    console.log("Navigating to http://localhost:8080/dashboard ...");
    await page.goto('http://localhost:8080/dashboard', { waitUntil: 'networkidle', timeout: 10000 });
    
    console.log("Navigation successful. Waiting 5 seconds for page load/errors...");
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (err) {
    console.error("Navigation failed:", err);
  }

  await browser.close();
}

run();
