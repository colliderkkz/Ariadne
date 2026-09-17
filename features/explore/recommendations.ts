export interface Recommendation {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export const tagLabels: Record<string, string> = {
  creative: "创造",
  learning: "学习",
  technology: "技术",
  handsOn: "动手",
  reflection: "思考",
  offline: "线下",
  social: "一起",
  lifestyle: "生活",
  short: "短时",
  project: "持续",
  medium: "一小时",
  long: "长时",
};

// Explore uses lightweight, deterministic rules rather than an LLM. One input
// can deliberately map to more than one tag when it describes multiple facets.
export const exploreTagMapping: Record<string, string[]> = {
  learning: ["learning"],
  creative: ["creation"],
  technology: ["learning-programming"],
  handsOn: ["creation-web-app"],
  reflection: ["learning-reading"],
  offline: ["experience-offline"],
  social: ["experience-social"],
  lifestyle: ["life"],
  project: ["creation-web-app"],
  visual: ["creation-visual"],
  travel: ["experience-travel"],
  AI: ["learning-ai"],
};

export function mapExploreTagsToTagIds(exploreTags: string[]): string[] {
  return [...new Set(exploreTags.flatMap((tag) => exploreTagMapping[tag] ?? []))];
}

const recommendations: Recommendation[] = [
  { id: "visual-effect", title: "做一个简单的视觉效果实验", content: "用一个画布、CSS 或熟悉的工具，让颜色、形状或光线发生一点变化。先做出一个会动的小结果。", category: "项目", tags: ["creative", "technology", "handsOn", "short"] },
  { id: "generative-art", title: "尝试一个生成艺术小项目", content: "设一个很小的规则，让图形或粒子自己生长。今天只需要完成第一个版本。", category: "项目", tags: ["creative", "technology", "handsOn", "project"] },
  { id: "web-interaction", title: "做一个有趣的网页交互", content: "给一个按钮、鼠标移动或滚动动作一个意外的回应，看看交互能不能带来一点乐趣。", category: "项目", tags: ["creative", "technology", "handsOn", "medium"] },
  { id: "curiosity-note", title: "学一个一直好奇的小概念", content: "找一篇短文章或一个可靠的讲解，给好奇心二十分钟，最后只留下一句自己的理解。", category: "学习", tags: ["learning", "reflection", "short"] },
  { id: "mini-research", title: "为一个问题做一页小研究", content: "从一个问题开始，收集三个来源，再把你目前相信的答案写下来。", category: "学习", tags: ["learning", "reflection", "project"] },
  { id: "practice-skill", title: "给一项技能做一次小练习", content: "选一个足够小的练习，不追求系统学习，只要让手和脑子一起进入状态。", category: "技能", tags: ["learning", "handsOn", "medium"] },
  { id: "new-walk", title: "去一条没走过的路散步", content: "不设目的地，只留意三个让你停下来的细节。回来后把它们记下来。", category: "体验", tags: ["offline", "short"] },
  { id: "local-experience", title: "为这个周末安排一次新体验", content: "选一个附近但从未去过的地方，给自己留出一段完整时间慢慢抵达。", category: "体验", tags: ["offline", "project", "long"] },
  { id: "meaningful-chat", title: "和一个人聊聊最近在想的事", content: "带着一个还没有答案的问题，约一位愿意认真听的人聊半小时。", category: "体验", tags: ["social", "reflection", "medium"] },
  { id: "shared-making", title: "约朋友一起做一个小东西", content: "一起定一个很轻的主题：一张图、一道菜或一个网页；重点是共同开始。", category: "体验", tags: ["social", "creative", "handsOn", "project"] },
  { id: "life-reset", title: "为一个生活角落做一次轻整理", content: "只选一个抽屉、桌面或数字文件夹，把它变成更愿意继续使用的样子。", category: "生活", tags: ["lifestyle", "handsOn", "short"] },
  { id: "life-experiment", title: "开始一个持续一周的小改变", content: "挑一个你想让生活变得不一样的地方，设计一个轻到不需要意志力的实验。", category: "生活", tags: ["lifestyle", "project", "long"] },
];

export function getRecommendations(tags: string[], batch = 0, size = 3) {
  const selected = new Set(tags);
  const ranked = recommendations
    .map((recommendation, index) => ({
      recommendation,
      index,
      score: recommendation.tags.filter((tag) => selected.has(tag)).length,
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ recommendation }) => recommendation);

  const start = (batch * size) % ranked.length;
  return Array.from({ length: size }, (_, index) => ranked[(start + index) % ranked.length]);
}
