import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:3001";
const EMAIL = process.env.QA_EMAIL ?? "hola@email.com";
const PASSWORD = process.env.QA_PASSWORD ?? "holahola";
const OUT_DIR = "/private/tmp/lessonflow-qa";

await fs.mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

const consoleErrors = [];
const networkErrors = [];
const results = [];

page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push({ url: page.url(), text: msg.text() });
});
page.on("requestfailed", (req) => {
  networkErrors.push({ url: page.url(), text: `${req.method()} ${req.url()} :: ${req.failure()?.errorText}` });
});
page.on("pageerror", (err) => consoleErrors.push({ url: page.url(), text: String(err) }));

async function snap(name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function runArea(name, fn) {
  const area = { area: name, status: "PASS", issues: [], screenshots: [] };
  try {
    await fn(area);
  } catch (error) {
    area.status = "FAIL";
    area.issues.push(String(error));
  }
  results.push(area);
}

async function clickByText(text) {
  const el = page.getByRole("button", { name: new RegExp(`^${text}$|${text}`, "i") }).first();
  if ((await el.count()) > 0) {
    await el.click();
    return true;
  }
  return false;
}

async function loginIfNeeded() {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");
  if ((await page.locator('input[type="email"]').count()) > 0) {
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await Promise.all([
      page.waitForLoadState("networkidle"),
      page.getByRole("button", { name: /login|sign in/i }).last().click(),
    ]);
  }
}

await runArea("Auth", async (area) => {
  await loginIfNeeded();
  if (!/dashboard|students|ai-generator|lesson-planner/.test(page.url())) {
    throw new Error(`Login did not redirect to app. URL: ${page.url()}`);
  }
  area.screenshots.push(await snap("01-auth-login"));
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");
  area.screenshots.push(await snap("01-auth-protected-redirect"));
  await clickByText("Sign out");
  await page.waitForTimeout(600);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");
  if (!page.url().includes("/login")) area.issues.push("Protected redirect after logout may not be enforced");
  area.screenshots.push(await snap("01-auth-logout-redirect"));
});

await runArea("Dashboard", async (area) => {
  await loginIfNeeded();
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");
  const hasSidebarActive = (await page.locator("a[aria-current='page']").count()) > 0;
  if (!hasSidebarActive) area.issues.push("No sidebar item with aria-current='page'");
  area.screenshots.push(await snap("02-dashboard"));
});

await runArea("Students", async (area) => {
  await loginIfNeeded();
  await page.goto(`${BASE_URL}/students`);
  await page.waitForLoadState("networkidle");
  const studentName = `QA Auto ${Date.now().toString().slice(-6)}`;
  await page.goto(`${BASE_URL}/students/new`);
  await page.fill("input[name='name']", studentName);
  await page.fill("textarea[name='goals']", "Improve speaking confidence");
  await page.fill("textarea[name='interests']", "Technology, travel");
  await page.fill("textarea[name='nextSuggestedFocus']", "Past simple correction");
  await page.getByRole("button", { name: /create student|save|add student/i }).last().click();
  await page.waitForTimeout(1500);
  if (!page.url().includes("/students/")) area.issues.push("Create student did not redirect to profile");
  area.screenshots.push(await snap("03-student-created-profile"));
  const editLink = page.getByRole("link", { name: /edit/i }).first();
  if ((await editLink.count()) > 0) {
    await editLink.click();
    await page.waitForLoadState("networkidle");
    await page.fill("textarea[name='notes']", "Edited by QA sweep.");
    await page.getByRole("button", { name: /save|update/i }).last().click();
    await page.waitForTimeout(1000);
  } else {
    area.issues.push("Edit student action not found");
  }
  area.screenshots.push(await snap("03-students-list"));
});

await runArea("AI Generator", async (area) => {
  await loginIfNeeded();
  await page.goto(`${BASE_URL}/ai-generator`);
  await page.waitForLoadState("networkidle");
  const topicInput = page.locator("input").nth(1);
  const materialSelect = page.locator("select").nth(1);
  const generateAndCheck = async (label, topic) => {
    await materialSelect.selectOption({ label });
    await topicInput.fill(topic);
    await page.getByRole("button", { name: /generate/i }).click();
    await page.waitForTimeout(3500);
    area.screenshots.push(await snap(`04-ai-${label.replace(/\s+/g, "-").toLowerCase()}`));
  };
  for (const [label, topic] of [
    ["Speaking questions", "Social media habits"],
    ["Vocabulary sheet", "Job interviews"],
    ["Quiz", "Travel planning"],
    ["Roleplay", "Workplace conflict"],
  ]) {
    await generateAndCheck(label, topic);
  }
  area.screenshots.push(await snap("04-ai-generator"));
});

await runArea("Materials Library", async (area) => {
  await loginIfNeeded();
  await page.goto(`${BASE_URL}/materials`);
  await page.waitForLoadState("networkidle");
  const cards = page.locator("article, [data-material-card], li");
  if ((await cards.count()) === 0) area.issues.push("No materials found");
  area.screenshots.push(await snap("05-materials"));
});

await runArea("Lesson Planner", async (area) => {
  await loginIfNeeded();
  await page.goto(`${BASE_URL}/lesson-planner`);
  await page.waitForLoadState("networkidle");
  const openForm = await clickByText("Create new lesson plan") || await clickByText("Open form");
  if (!openForm) area.issues.push("Could not open lesson creation form");
  area.screenshots.push(await snap("06-lesson-planner"));
});

await runArea("Weekly Prep", async (area) => {
  await loginIfNeeded();
  await page.goto(`${BASE_URL}/weekly-prep`);
  await page.waitForLoadState("networkidle");
  await clickByText("Prepare my week");
  await page.waitForTimeout(1000);
  area.screenshots.push(await snap("07-weekly-prep"));
});

await runArea("Settings + Theme", async (area) => {
  await loginIfNeeded();
  await page.goto(`${BASE_URL}/settings`);
  await page.waitForLoadState("networkidle");
  await clickByText("Soft light");
  await page.waitForTimeout(300);
  await clickByText("High contrast");
  await page.waitForTimeout(300);
  await clickByText("Coral");
  await page.waitForTimeout(300);
  area.screenshots.push(await snap("08-settings-theme"));
});

await runArea("Responsive", async (area) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForLoadState("networkidle");
  area.screenshots.push(await snap("09-responsive-tablet"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  area.screenshots.push(await snap("10-responsive-mobile"));
});

const out = {
  results,
  consoleErrors,
  networkErrors,
  outDir: OUT_DIR,
};

await fs.writeFile(path.join(OUT_DIR, "qa-report.json"), JSON.stringify(out, null, 2));
await browser.close();
console.log(JSON.stringify(out, null, 2));
