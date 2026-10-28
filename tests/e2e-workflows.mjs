import { chromium } from "playwright";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3001";
const EMAIL = process.env.QA_EMAIL ?? "hola@email.com";
const PASSWORD = process.env.QA_PASSWORD ?? "holahola";

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.getByRole("button", { name: "Login" }).last().click();
  await page.waitForTimeout(1200);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await login(page);

  const topic = `E2E Topic ${Date.now()}`;
  await page.goto(`${BASE_URL}/lesson-planner`);
  await page.getByTestId("create-lesson").first().click();
  await page.fill('input[name="date"]', "2099-12-31");
  await page.fill('input[name="topic"]', topic);
  await page.fill('input[name="lessonGoal"]', `Goal ${topic}`);
  await page.getByTestId("create-lesson").last().click();
  await page.waitForTimeout(1500);

  let text = await page.locator("body").innerText();
  if (!text.includes(topic)) {
    throw new Error("Lesson was not visible after create.");
  }

  await page.reload({ waitUntil: "networkidle" });
  text = await page.locator("body").innerText();
  if (!text.includes(topic)) {
    throw new Error("Lesson disappeared after refresh.");
  }

  const lessonCard = page.locator("article").filter({ hasText: topic }).first();
  await lessonCard.getByTestId("delete-lesson").click();
  await page.waitForTimeout(1200);
  await page.getByTestId("undo-action").first().click();
  await page.waitForTimeout(1200);
  await page.reload({ waitUntil: "networkidle" });
  text = await page.locator("body").innerText();
  if (!text.includes(topic)) {
    throw new Error("Lesson did not reappear after undo + refresh.");
  }

  const studentName = `E2E Student ${Date.now().toString().slice(-6)}`;
  await page.goto(`${BASE_URL}/students/new`);
  await page.fill("input[name='name']", studentName);
  await page.fill("textarea[name='goals']", "E2E goal");
  await page.getByRole("button", { name: /create student|save/i }).last().click();
  await page.waitForTimeout(1300);
  await page.getByTestId("delete-student").click();
  await page.getByTestId("undo-action").first().click();
  await page.waitForTimeout(900);
  await page.goto(`${BASE_URL}/students`);
  text = await page.locator("body").innerText();
  if (!text.includes(studentName)) {
    throw new Error("Student not visible after delete undo.");
  }

  await browser.close();
  console.log("E2E PASS");
}

run().catch((error) => {
  console.error("E2E FAIL:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
