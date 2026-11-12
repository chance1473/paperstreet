import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const localApp = process.env.PAPERSTREET_E2E_LOCAL_URL;

test("a fresh paper account can buy and sell a share", async ({ page }) => {
  if (!localApp) {
    test.skip(true, "Set PAPERSTREET_E2E_LOCAL_URL for an isolated local app and database.");
    return;
  }
  const app = new URL(localApp);
  expect(app.protocol).toBe("http:");
  expect(["localhost", "127.0.0.1", "[::1]"]).toContain(app.hostname);
  test.setTimeout(90_000);

  const account = `journey${randomUUID().replaceAll("-", "").slice(0, 12)}`;

  await test.step("Open a paper account from the public landing page", async () => {
    await page.goto(app.origin);
    await page.getByRole("link", { name: "Open an account" }).first().click();
    await page.getByLabel("Display name").fill("Journey Verification");
    await page.getByLabel("Username").fill(account);
    await page.getByLabel("Email", { exact: true }).fill(`${account}@paperstreet.test`);
    await page.getByLabel("Password", { exact: true }).fill(randomUUID());
    await page.getByRole("button", { name: "Create account", exact: true }).click();

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Total account value" })).toBeVisible();
    await expect(page.getByText("$100,000.00", { exact: true }).first()).toBeVisible();
  });

  const transactions = page.getByRole("link", { name: "Transactions", exact: true }).first();
  const appleRows = page.getByRole("row").filter({
    has: page.getByRole("link", { name: "AAPL", exact: true }),
  });
  const buy = appleRows.filter({ has: page.getByRole("cell", { name: /^buy$/i }) });
  const sell = appleRows.filter({ has: page.getByRole("cell", { name: /^sell$/i }) });

  await test.step("Buy one share and verify the transaction survives reload", async () => {
    await page.getByRole("link", { name: "AAPL", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "AAPL", exact: true })).toBeVisible();
    await page.getByLabel("Quantity").fill("1");
    await page.getByRole("button", { name: "Review buy", exact: true }).click();
    await page.getByRole("button", { name: "Confirm buy", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await transactions.click();
    await expect(buy).toHaveCount(1);
    await expect(buy.getByRole("cell", { name: "1", exact: true })).toBeVisible();

    await page.reload();
    await expect(buy).toHaveCount(1);
  });

  await test.step("Sell the share and check both ledger entries", async () => {
    await buy.getByRole("link", { name: "AAPL", exact: true }).click();
    await page.getByRole("button", { name: "Sell", exact: true }).click();
    await page.getByLabel("Quantity").fill("1");
    await page.getByRole("button", { name: "Review sell", exact: true }).click();
    await page.getByRole("button", { name: "Confirm sell", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await transactions.click();

    await expect(buy).toHaveCount(1);
    await expect(sell).toHaveCount(1);
    await expect(sell.getByRole("cell", { name: "1", exact: true })).toBeVisible();
    await expect(appleRows).toHaveCount(2);
  });
});
