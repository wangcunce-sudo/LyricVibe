const puppeteer = require("puppeteer");
const path = require("path");

(async () => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const outputDir = "/Users/guanz/hack/screenshots";

  // Screenshot 1: Homepage
  const page1 = await browser.newPage();
  await page1.setViewport({ width: 1440, height: 900 });
  await page1.goto("http://localhost:3000", { waitUntil: "networkidle2" });
  await page1.screenshot({
    path: path.join(outputDir, "homepage.png"),
    fullPage: true,
  });
  console.log("Homepage screenshot saved");

  // Screenshot 2: Create page (upload state)
  const page2 = await browser.newPage();
  await page2.setViewport({ width: 1440, height: 900 });
  await page2.goto("http://localhost:3000/create", {
    waitUntil: "networkidle2",
  });
  await page2.screenshot({
    path: path.join(outputDir, "create-page.png"),
    fullPage: false,
  });
  console.log("Create page screenshot saved");

  // Screenshot 3: Create page with demo loaded
  // Click the "Try Demo" button
  const page3 = await browser.newPage();
  await page3.setViewport({ width: 1440, height: 900 });
  await page3.goto("http://localhost:3000/create", {
    waitUntil: "networkidle2",
  });

  // Wait for and click the Try Demo button
  await page3.waitForSelector("button");
  const buttons = await page3.$$("button");
  for (const btn of buttons) {
    const text = await page3.evaluate((el) => el.textContent, btn);
    if (text.includes("Try Demo")) {
      await btn.click();
      break;
    }
  }

  // Wait for demo to load
  await new Promise((r) => setTimeout(r, 2000));

  // Click Analyze button
  const analyzeBtns = await page3.$$("button");
  for (const btn of analyzeBtns) {
    const text = await page3.evaluate((el) => el.textContent, btn);
    if (text.includes("Analyze")) {
      await btn.click();
      break;
    }
  }

  // Wait for analysis
  await new Promise((r) => setTimeout(r, 2000));

  await page3.screenshot({
    path: path.join(outputDir, "demo-workspace.png"),
    fullPage: false,
  });
  console.log("Demo workspace screenshot saved");

  await browser.close();
  console.log("All screenshots done!");
})();
