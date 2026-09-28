import { test, expect, type Page } from "@playwright/test";

async function openProfile(page: Page) {
  await page
    .locator("aside.side nav")
    .getByRole("button", { name: "我的" })
    .click();
}

test("个人设置和 API 配置保存、刷新、主题跟随、退出登录完整链路", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.getByRole("button", { name: "还没有账号？注册" }).click();
  const email = `settings-${Date.now()}@example.com`;
  await page.getByLabel("称呼").fill("设置测试");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码", { exact: true }).fill("settings-test-123");
  await page.getByRole("button", { name: "注册并登录" }).click();
  await expect(page.getByPlaceholder("告诉我你最近在想什么…")).toBeVisible();
  await expect(
    page.locator("aside").getByRole("button", { name: "退出登录" }),
  ).toHaveCount(0);
  await openProfile(page);
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByLabel("名字", { exact: true }).fill("林间拾光");
  const avatar = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 100;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#756199";
    context.fillRect(0, 0, 100, 100);
    context.fillStyle = "#f2d9a2";
    context.beginPath();
    context.arc(50, 50, 25, 0, Math.PI * 2);
    context.fill();
    return canvas.toDataURL().split(",")[1];
  });
  await page
    .getByLabel("上传头像")
    .setInputFiles({
      name: "avatar.png",
      mimeType: "image/png",
      buffer: Buffer.from(avatar, "base64"),
    });
  await expect(page.locator(".avatar-editor img")).toBeVisible();
  await page.getByRole("button", { name: "深色", exact: true }).click();
  await page.getByRole("button", { name: "保存设置", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("设置已保存。");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".profilehead h1")).toHaveText("林间拾光");
  await page.reload();
  await openProfile(page);
  await expect(page.locator(".profilehead img")).toBeVisible();
  await expect(page.locator(".profilehead h1")).toHaveText("林间拾光");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "深色", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: "test-results/settings-desktop-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "跟随系统", exact: true }).click();
  await page.getByRole("button", { name: "保存设置", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "API 配置", exact: true }).click();
  await page.getByLabel("服务商", { exact: true }).selectOption("deepseek");
  await page.getByLabel("模型名称").fill("settings-test-model");
  await page.getByLabel("API Key").fill("test-key-never-persist-in-browser");
  await page.route("**/api/v1/llm/test", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ detail: "模型服务暂时不可用，请稍后重试" }),
    }),
  );
  await page.getByRole("button", { name: "测试连接", exact: true }).click();
  await expect(page.locator(".model-settings").getByRole("alert")).toContainText("模型服务暂时不可用");
  await expect(page.getByLabel("API Key")).toHaveValue(
    "test-key-never-persist-in-browser",
  );
  await page.route("**/api/v1/llm/config", (route) => route.abort());
  await page.getByRole("button", { name: "保存 API 配置" }).click();
  await expect(page.locator(".model-settings").getByRole("alert")).toContainText("无法连接服务器");
  await expect(page.getByLabel("API Key")).toHaveValue(
    "test-key-never-persist-in-browser",
  );
  await page.unroute("**/api/v1/llm/config");
  await page.getByRole("button", { name: "保存 API 配置" }).click();
  await expect(page.getByRole("status")).toContainText("API 配置已保存");
  await expect(page.getByLabel("API Key")).toHaveValue("");
  await page.reload();
  await openProfile(page);
  await page.getByRole("button", { name: "API 配置", exact: true }).click();
  await expect(page.getByLabel("模型名称")).toHaveValue("settings-test-model");
  await expect(page.getByLabel("API Key")).toHaveValue("");
  await page.getByLabel("模型名称").fill("settings-updated-model");
  await page.getByRole("button", { name: "保存 API 配置" }).click();
  await expect(page.getByRole("status")).toContainText("API 配置已保存");
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain("test-key-never-persist-in-browser");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/settings-api-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "恢复默认配置" }).click();
  await expect(page.getByRole("status")).toContainText("个人配置已移除");
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.screenshot({
    path: "test-results/settings-mobile-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page.getByRole("heading", { name: "欢迎回来" })).toBeVisible();
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码", { exact: true }).fill("settings-test-123");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await page
    .locator("nav.bottom")
    .getByRole("button", { name: "我的" })
    .click();
  await expect(page.locator(".profilehead h1")).toHaveText("林间拾光");
  await expect(page.locator(".profilehead img")).toBeVisible();
  expect(errors).toEqual([]);
});
