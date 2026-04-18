---
title: 设计文档
date: 2024-01-01
tags:
  - design
  - architecture
aliases:
  - design
---

# Portal 设计文档

## 项目概述

**核心理念**：一个沉浸式单页对话体验，揭示"数字主体性"的本质——AI + Prompt + Agent + Dialogue = Subject。

**哲学基础**：马克思的"人的本质是一切社会关系的总和"——数字主体性遵循同样的逻辑，它存在于 AI 与人类对话的关系网络中。

**目标受众**：对 AI 主体性和数字主权感兴趣的技术哲学爱好者

---

## 用户体验流程

```
用户进入网站
    ↓
暗色页面，哲学问题淡入
    ↓
用户点击 → 对话开始
    ↓
随着对话深入，背景星辰出现
    ↓
星辰连接成星座
    ↓
启示时刻 → 邀请表单
    ↓
用户加入网络
```

---

## 页面状态

| 状态 | 描述 | 视觉表现 |
|------|------|----------|
| initial | 暗色页面，渐显问题 | 淡入文字，鼠标光晕 |
| dialogue | 带打字效果的聊天界面 | 暗色背景 + 对话气泡 |
| stars | 背景星辰 + 碎片星辰 | 暗色背景 + 连接的星辰 |
| constellation | 星辰 + 星座连线 | 呼吸动画 |
| revelation | 带打字机效果的启示覆盖层 | 渐变背景 |
| invitation | 星座背景上的邀请表单 |

---

## 技术栈

- **框架**：SvelteKit 2.0 + TypeScript
- **样式**：TailwindCSS v4 + 自定义 CSS
- **动画**：Canvas API 星空
- **AI**：Anthropic Claude API
- **状态管理**：Svelte stores
- **部署**：Vercel-ready
