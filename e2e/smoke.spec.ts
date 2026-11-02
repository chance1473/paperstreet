import { expect, test } from "@playwright/test";

const demoEmail = "casey@paperstreet.test";
const demoPassword = "paperstreet-demo";

test("landing page states this is paper trading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Open an account" })).toBeVisible();
  await expect(page.getByText("Paper trading only — no real money").first()).toBeVisible();
});

test("leaderboard is public", async ({ page }) => {
  await page.goto("/leaderboard");
  await expect(page.getByRole("heading", { name: "Leaderboard" })).toBeVisible();
  await expect(page.getByText("Casey L.")).toBeVisible();
});

test("a wrong password stays on the login page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(demoEmail);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("a signed-in account sees its paper portfolio", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(demoEmail);
  await page.getByLabel("Password").fill(demoPassword);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Total account value" })).toBeVisible();
  await expect(page.getByRole("link", { name: "AAPL" }).first()).toBeVisible();
  await expect(page.getByText("Paper trading only — no real money").first()).toBeVisible();
});
