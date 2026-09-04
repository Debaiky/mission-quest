import { expect, test } from "@playwright/test";

test.describe("child", () => {
  test("logs in with the family code, picks Alex, enters the PIN, sees missions", async ({ page }) => {
    await page.goto("/kid/login");
    await page.getByLabel("Family code").fill("SUNNY-FOX-42");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(page.getByRole("heading", { name: "Who's playing?" })).toBeVisible();
    await page.getByRole("button", { name: /Alex/ }).click();
    await expect(page.getByRole("heading", { name: /Hi Alex! Enter your PIN/ })).toBeVisible();
    for (const digit of ["1", "1", "1", "1"]) {
      await page.getByRole("button", { name: digit, exact: true }).click();
    }

    await expect(page).toHaveURL(/\/kid(\/welcome)?$/);
    if (page.url().endsWith("/kid/welcome")) {
      await page.getByRole("button", { name: "Skip" }).click();
      await expect(page).toHaveURL(/\/kid$/);
    }
    // Any queued celebration is dismissed by tapping it.
    const dialog = page.getByRole("dialog");
    if (await dialog.isVisible().catch(() => false)) await dialog.click();

    await expect(page.getByRole("heading", { name: /Alex/ })).toBeVisible();
    await expect(page.getByText("MISSIONS", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  });

  test("a child is sent to the kid login when logged out, and cannot see the parent app", async ({ page }) => {
    await page.goto("/kid");
    await expect(page).toHaveURL(/\/kid\/login/);
    await page.goto("/parent/approvals");
    await expect(page).toHaveURL(/\/login/);
  });
});
