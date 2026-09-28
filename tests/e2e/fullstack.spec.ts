import { test, expect, type Page } from "@playwright/test";

const apiUrl = "http://127.0.0.1:8001/api/v1";
const password = "e2e-password-123";
const unique = () => `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function register(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "还没有账号？注册" }).click();
  const email = `${unique()}@example.com`;
  await page.getByLabel("称呼").fill("链路测试");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.getByRole("button", { name: "注册并登录" }).click();
  await expect(page.getByPlaceholder("告诉我你最近在想什么…")).toBeVisible();
  return email;
}

async function nav(page: Page, name: string) {
  await page
    .locator("aside.side nav")
    .getByRole("button", { name, exact: false })
    .click();
}

test("UI: 想法、标签、项目和记录创建后刷新可读取，编辑与删除真正持久化", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await register(page);
  await nav(page, "想法");
  await page.getByRole("button", { name: "记下想法" }).click();
  await page.getByPlaceholder("脑子里刚刚闪过什么？").fill("端到端学习后端");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "端到端学习后端" }),
  ).toBeVisible();
  await page.reload();
  await nav(page, "想法");
  await page.getByRole("button", { name: /端到端学习后端/ }).click();
  await page.getByRole("button", { name: "编辑想法", exact: true }).click();
  await page.getByPlaceholder("为这个想法起个名字").fill("修改后的学习想法");
  await page.getByRole("button", { name: "保存想法" }).click();
  await expect(
    page.getByRole("heading", { name: "修改后的学习想法" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "开启这个项目" }).click();
  await page
    .locator(".dialog")
    .getByRole("button", { name: "开启项目", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "修改后的学习想法" }),
  ).toBeVisible();
  await page.getByRole("heading", { name: "修改后的学习想法" }).dblclick();
  await page.getByLabel("项目标题").fill("修改后的项目");
  await page.getByLabel("项目标题").press("Enter");
  await expect(
    page.getByRole("heading", { name: "修改后的项目" }),
  ).toBeVisible();
  await page.reload();
  await nav(page, "项目");
  await expect(
    page.getByRole("heading", { name: "修改后的项目" }),
  ).toBeVisible();

  await nav(page, "想法");
  await page.getByRole("button", { name: "标签", exact: true }).click();
  await page.getByPlaceholder("名称，例如：摄影").fill("E2E摄影");
  await page.getByRole("button", { name: "创建", exact: true }).click();
  await expect(
    page.locator(".tag-parent").getByText("E2E摄影", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await nav(page, "想法");
  await page.getByRole("button", { name: "标签", exact: true }).click();
  const tag = page.locator(".tag-group").filter({ hasText: "E2E摄影" });
  await tag.getByRole("button", { name: "修改标签" }).click();
  await page.locator(".dialog input").fill("E2E摄影改");
  await page
    .locator(".dialog")
    .getByRole("button", { name: "保存", exact: true })
    .click();
  await expect(
    page.locator(".tag-parent").getByText("E2E摄影改", { exact: true }),
  ).toBeVisible();

  await nav(page, "记录");
  await page.getByRole("button", { name: "补记时间" }).click();
  await page.getByLabel("做了什么？").fill("数据库持久化验证");
  await page.getByLabel("开始", { exact: true }).fill("10:00");
  await page.getByRole("button", { name: "留下记录" }).click();
  await expect(
    page.locator(".day-log").getByText("数据库持久化验证", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await nav(page, "记录");
  await expect(
    page.locator(".day-log").getByText("数据库持久化验证", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/records-desktop.png",
    fullPage: true,
  });

  await nav(page, "想法");
  await page.getByRole("button", { name: "标签", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .locator(".tag-group")
    .filter({ hasText: "E2E摄影改" })
    .getByRole("button", { name: "删除标签" })
    .click();
  await expect(
    page.locator(".tag-parent").getByText("E2E摄影改", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "全部想法" }).click();
  await page.getByRole("button", { name: /修改后的学习想法/ }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "删除", exact: true }).click();
  await expect(page.getByText("这里还没有符合条件的想法。")).toBeVisible();
  await page.reload();
  await nav(page, "想法");
  await expect(page.getByText("这里还没有符合条件的想法。")).toBeVisible();
  const localKeys = await page.evaluate(() => Object.keys(localStorage));
  expect(
    localKeys.filter((key) =>
      /ariadne:(ideas|projects|tags|activity-records|project-messages|llm-config)/.test(
        key,
      ),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("HTTP + browser refresh: 消息、记录、项目完整 CRUD 与跨账号隔离", async ({
  page,
  request,
}) => {
  await register(page);
  const token = await page.evaluate(() =>
    sessionStorage.getItem("ariadne:session"),
  );
  const headers = { Authorization: `Bearer ${token}` };
  const project = await (
    await request.post(`${apiUrl}/projects`, {
      headers,
      data: { title: "消息持久化项目" },
    })
  ).json();
  const message = await (
    await request.post(`${apiUrl}/messages`, {
      headers,
      data: { project_id: project.id, content: "刷新后仍在的消息" },
    })
  ).json();
  const record = await (
    await request.post(`${apiUrl}/records`, {
      headers,
      data: {
        title: "API记录",
        minutes: 10,
        project_id: project.id,
        completed_at: new Date().toISOString(),
      },
    })
  ).json();
  await page.reload();
  await nav(page, "项目");
  await expect(
    page.locator(".messages").getByText("刷新后仍在的消息"),
  ).toBeVisible();
  expect(
    (
      await request.patch(`${apiUrl}/messages/${message.id}`, {
        headers,
        data: { content: "消息已修改" },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await request.patch(`${apiUrl}/records/${record.id}`, {
        headers,
        data: { title: "记录已修改", minutes: 15 },
      })
    ).ok(),
  ).toBeTruthy();
  await page.reload();
  await nav(page, "项目");
  await expect(page.locator(".messages").getByText("消息已修改")).toBeVisible();
  await nav(page, "记录");
  await expect(page.locator(".day-log").getByText("记录已修改")).toBeVisible();

  const email = `${unique()}@example.com`;
  await request.post(`${apiUrl}/auth/register`, {
    data: { email, password, display_name: "其他账号" },
  });
  const other = await (
    await request.post(`${apiUrl}/auth/login`, {
      form: { username: email, password },
    })
  ).json();
  for (const path of [
    `messages/${message.id}`,
    `records/${record.id}`,
    `projects/${project.id}`,
  ]) {
    expect(
      (
        await request.get(`${apiUrl}/${path}`, {
          headers: { Authorization: `Bearer ${other.access_token}` },
        })
      ).status(),
    ).toBe(404);
    expect(
      (await request.delete(`${apiUrl}/${path}`, { headers })).status(),
    ).toBe(204);
  }
});

test("旧 localStorage 只经确认导入一次，旧 Key 清除且服务器失败保留编辑输入", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem("seeded")) return;
    sessionStorage.setItem("seeded", "yes");
    const now = new Date().toISOString();
    localStorage.setItem(
      "ariadne:ideas",
      JSON.stringify([
        {
          id: "legacy-one",
          title: "旧想法",
          content: "旧内容",
          tagIds: [],
          status: "inbox",
          createdAt: now,
          updatedAt: now,
        },
      ]),
    );
    localStorage.setItem(
      "ariadne:llm-config",
      JSON.stringify({ apiKey: "must-never-be-sent" }),
    );
  });
  await register(page);
  expect(
    await page.evaluate(() => localStorage.getItem("ariadne:llm-config")),
  ).toBeNull();
  await page.getByRole("button", { name: "导入当前账号" }).click();
  await expect(page.getByRole("button", { name: "导入当前账号" })).toHaveCount(
    0,
  );
  await page.reload();
  await nav(page, "想法");
  await expect(page.getByRole("heading", { name: "旧想法" })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("ariadne:ideas")),
  ).toBeNull();
  await page.getByRole("button", { name: "记下想法" }).click();
  await page.getByPlaceholder("脑子里刚刚闪过什么？").fill("故障时保留的内容");
  await page.route("**/api/v1/ideas", (route) =>
    route.request().method() === "POST" ? route.abort() : route.continue(),
  );
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await expect(page.locator(".connection-notice[role=alert]")).toContainText(
    "无法连接服务器",
  );
  await expect(page.getByPlaceholder("脑子里刚刚闪过什么？")).toHaveValue(
    "故障时保留的内容",
  );
});

test("移动端登录和导航正常，API 配置可输入密钥但不回显", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await register(page);
  await page
    .locator("nav.bottom")
    .getByRole("button", { name: "我的" })
    .click();
  await page.getByRole("button", { name: "API 配置", exact: true }).click();
  await expect(
    page.getByText("密钥加密保存在服务端，保存后不回显。"),
  ).toBeVisible();
  await expect(page.getByLabel("API Key")).toHaveValue("");
  await page.screenshot({
    path: "test-results/profile-mobile.png",
    fullPage: true,
  });
});
