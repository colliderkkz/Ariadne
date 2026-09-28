import type {
  ActivityRecord,
  ChatMessage,
  Idea,
  LlmConfig,
  LlmInput,
  Project,
  ProjectMessage,
  Tag,
  User,
} from "@/lib/types";

const baseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000"
).replace(/\/$/, "");
const tokenKey = "ariadne:session";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function setSessionToken(token: string | null) {
  if (token) sessionStorage.setItem(tokenKey, token);
  else sessionStorage.removeItem(tokenKey);
}

export function hasSession() {
  return Boolean(sessionStorage.getItem(tokenKey));
}

// API 边界统一转换命名；UI 继续使用原有 camelCase，不散落字段转换与 fetch。
function mapKeys(value: unknown, direction: "request" | "response"): unknown {
  if (Array.isArray(value))
    return value.map((item) => mapKeys(item, direction));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        direction === "request"
          ? key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
          : key.replace(/_([a-z])/g, (_, letter: string) =>
              letter.toUpperCase(),
            ),
        mapKeys(item, direction),
      ]),
    );
  return value;
}

export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    form?: URLSearchParams;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const token =
    typeof window === "undefined" ? null : sessionStorage.getItem(tokenKey);
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1${path}`, {
      method: options.method ?? "GET",
      headers,
      cache: "no-store",
      body:
        options.form ??
        (options.body !== undefined
          ? JSON.stringify(mapKeys(options.body, "request"))
          : undefined),
      signal: options.signal ?? AbortSignal.timeout(90000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError(
      0,
      "无法连接服务器，请检查网络后重试。未保存的输入仍保留在当前页面。",
    );
  }
  const data =
    response.status === 204
      ? undefined
      : await response.json().catch(() => undefined);
  if (!response.ok) {
    if (response.status === 401 && token) {
      setSessionToken(null);
      window.dispatchEvent(new Event("ariadne:session-expired"));
    }
    const detail = (data as { detail?: unknown } | undefined)?.detail;
    throw new ApiError(
      response.status,
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((item: { msg: string }) => item.msg).join("；")
          : "请求失败，请稍后重试",
    );
  }
  return mapKeys(data, "response") as T;
}

export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
async function listAll<T>(path: string): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await request<Page<T>>(`${path}?limit=100&offset=${offset}`);
    result.push(...page.items);
    if (result.length >= page.total || page.items.length === 0) return result;
  }
}

type IdeaInput = Pick<Idea, "title" | "content" | "tagIds" | "status">;
type ProjectInput = Pick<
  Project,
  "title" | "description" | "innerThoughts" | "status" | "linkedIdeaId"
>;
type TagInput = Pick<Tag, "name" | "parentId">;
type RecordInput = Omit<ActivityRecord, "id">;
type MessageInput = Pick<ProjectMessage, "projectId" | "role" | "content">;

function resource<T, Create, Update = Partial<Create>>(path: string) {
  return {
    list: () => listAll<T>(path),
    get: (id: string) => request<T>(`${path}/${encodeURIComponent(id)}`),
    create: (body: Create) => request<T>(path, { method: "POST", body }),
    update: (id: string, body: Update) =>
      request<T>(`${path}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body,
      }),
    remove: (id: string) =>
      request<void>(`${path}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  };
}

export const api = {
  async login(email: string, password: string) {
    const result = await request<{ accessToken: string }>("/auth/login", {
      method: "POST",
      form: new URLSearchParams({ username: email, password }),
    });
    setSessionToken(result.accessToken);
    return api.me();
  },
  register: (email: string, password: string, displayName: string) =>
    request<User>("/auth/register", {
      method: "POST",
      body: { email, password, displayName },
    }),
  me: () => request<User>("/users/me"),
  updateMe: (body: Pick<User, "displayName" | "avatar" | "theme">) =>
    request<User>("/users/me", { method: "PATCH", body }),
  ideas: resource<Idea, IdeaInput>("/ideas"),
  projects: resource<Project, ProjectInput>("/projects"),
  tags: resource<Tag, TagInput>("/tags"),
  records: resource<ActivityRecord, RecordInput>("/records"),
  messages: resource<ProjectMessage, MessageInput, { content: string }>(
    "/messages",
  ),
  llmStatus: () => request<LlmConfig>("/llm/status"),
  saveLlm: (body: LlmInput) =>
    request<LlmConfig>("/llm/config", { method: "PUT", body }),
  resetLlm: () => request<LlmConfig>("/llm/config", { method: "DELETE" }),
  testLlm: (body: LlmInput) =>
    request<{ message: string }>("/llm/test", { method: "POST", body }),
  explore: (messages: ChatMessage[]) =>
    request<{ content: string }>("/llm/explore", {
      method: "POST",
      body: { messages: messages.slice(-40) },
    }),
  organize: (messages: ChatMessage[]) =>
    request<Pick<Idea, "title" | "content">>("/llm/organize", {
      method: "POST",
      body: { messages: messages.slice(-40) },
    }),
  chat: (projectId: string, content: string) =>
    request<{ userMessage: ProjectMessage; assistantMessage: ProjectMessage }>(
      `/projects/${encodeURIComponent(projectId)}/chat`,
      { method: "POST", body: { content } },
    ),
  importLegacy: (body: unknown) =>
    request<{ imported: Record<string, number> }>("/imports/local-storage", {
      method: "POST",
      body,
    }),
};

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "操作失败，请重试";
