import { expect, test } from "@playwright/test";

const PARENT = { email: "demo@missionquest.app", password: "demo-parent-2026" };

test.describe("parent", () => {
  test("logs in, sees the dashboard, and works the approval queue", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(PARENT.email);
    await page.getByLabel("Password").fill(PARENT.password);
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/parent$/);
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening)/ })).toBeVisible();
    await expect(page.getByText("Alex", { exact: true }).first()).toBeVisible();

    await page.goto("/parent/approvals");
    await expect(page.getByRole("heading", { name: "Needs your approval" })).toBeVisible();
    const approve = page.getByRole("button", { name: "Approve", exact: true }).first();
    if (await approve.isVisible()) {
      await approve.click();
      await expect(page.getByText(/Approved · \+\d+ points/)).toBeVisible();
    } else {
      await expect(page.getByText("Nothing to approve")).toBeVisible();
    }
  });

  test("creates a quick mission for today and sees it in the task table", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(PARENT.email);
    await page.getByLabel("Password").fill(PARENT.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/parent$/);
    await page.goto("/parent/tasks");

    const title = `E2E mission ${Date.now()}`;
    await page.getByRole("button", { name: "+ Quick-add for today" }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Add for today", exact: true }).click();
    await expect(page.getByText(title)).toBeVisible();
  });

  test("a child cannot open parent pages", async ({ page }) => {
    await page.goto("/parent");
    await expect(page).toHaveURL(/\/login/);
  });
});
