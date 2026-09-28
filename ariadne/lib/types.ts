export type IdeaStatus =
  "inbox" | "exploring" | "convertedToProject" | "archived";
export type ProjectStatus = "active" | "paused" | "completed" | "archived";

export interface Tag {
  id: string;
  name: string;
  parentId: string | null;
  type: "system" | "custom";
  createdAt: string;
  updatedAt: string;
}
export interface Idea {
  id: string;
  title: string;
  content: string;
  tagIds: string[];
  status: IdeaStatus;
  createdAt: string;
  updatedAt: string;
}
export interface Project {
  id: string;
  title: string;
  description: string;
  innerThoughts?: string;
  status: ProjectStatus;
  linkedIdeaId?: string;
  createdAt: string;
  updatedAt: string;
}
export interface ProjectMessage {
  id: string;
  projectId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
export interface ActivityRecord {
  id: string;
  title: string;
  minutes: number;
  tagId: string | null;
  projectId?: string | null;
  note?: string;
  startedAt?: string;
  completedAt: string;
}
export interface LlmConfig {
  provider: string;
  model: string;
  configured: boolean;
  baseUrl: string;
  source: "personal" | "server";
}
export interface ActiveTimer {
  projectId: string;
  startedAt: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatar: string | null;
  theme: "system" | "light" | "dark";
}

export interface LlmInput {
  provider: string;
  model: string;
  apiKey?: string;
}
