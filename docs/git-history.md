# Git 历史整理

## 最终结构

唯一活动仓库位于 `M:\Ariadne\.git`。从根目录或 `ariadne/` 运行 `git rev-parse --show-toplevel` 都返回 `M:/Ariadne`。`ariadne` 是普通目录，不再是 gitlink/submodule。

采用原内层仓库作为主历史，保留其所有分支、远程配置和提交。整理前主分支 `1.0` 为 `8205a89`，没有用户未提交的受跟踪应用修改；本轮应用修改仍在工作区。原外层仓库的 `21c3d85` 保留为 `archive/outer-before-consolidation` 分支。没有强制推送、删历史或清理 Git 对象。

## 可恢复备份

本地 `.git-history/` 已被忽略，不会被发布或提交：

- `outer-before-consolidation.bundle`：外层全部引用与完整历史，已运行 `git bundle verify`。
- `inner-before-consolidation.bundle`：内层全部引用与完整历史，已运行 `git bundle verify`。
- `outer.git/`：原外层 Git 元数据，包含索引与引用。
- `inner-working.patch`：整理时的受跟踪修改快照。
- `inner-untracked.txt`：整理时未跟踪文件清单；实际源文件仍在工作目录中。

可只读查看旧外层历史：

```powershell
git log archive/outer-before-consolidation --oneline
git --git-dir=.git-history/outer.git log --oneline
git bundle verify .git-history/inner-before-consolidation.bundle
```

如需恢复独立旧检出，请在另一个新目录克隆对应 bundle；不要把旧检出覆盖到当前工作区。原先未跟踪的 `Ariadne产品介绍.docx` 原样保留。

旧部署压缩包与原有源码仍可从历史中恢复。当前 `build/` 是 Cloudflare 构建插件源码，不是构建产物，已保留。前端部署到 Sites 时应在 `ariadne/` 执行并指定该子目录作为应用根；当前改动未发布到远程站点。
