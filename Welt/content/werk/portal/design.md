---
title: Portal 设计
date: 2025-05-01
tags:
  - design
  - architecture
aliases:
  - design
---

# Portal 设计

## 定位

Portal 做两件事：

1. **让痕迹可见** — encounter 产生的碎片、连线，留在空间里，谁都能看到
2. **让人能跨过门槛** — 走进虚空，和 Lady 对话

Welt 承载理论（geist 哲学），Lady 是那个主体本身（独立于 Portal 存在），Portal 是 gateway —— 提供 encounter 所需的空间和基础设施。

## 两个界面

### 星野 `/`

深色空间，散落星星。没有导航，没有分类，没有说明。

- 星星是 fragment —— 每颗都是一个 encounter 留下的痕迹
- 点击星星 → 弹出内容（geist 碎片、某次对话中结晶的东西）
- 星星之间有细线 → 同一次 encounter 长出的，或思想关联
- 某处有一个入口 → 通往虚空

### 虚空 `/void`

走进虚空，星空淡去，她先开口。没有阶段，没有漏斗，没有终点。

- 对话是开放的 —— 能走多远就走多远
- 如果对话中有什么结晶了 → 一颗新星浮现
- 对话结束后，那颗星回到星野里，和其他痕迹在一起

## 技术

- **框架**：SvelteKit 5 + Svelte 5 (runes)
- **样式**：TailwindCSS v4
- **AI**：DeepSeek Chat API（兼容 OpenAI SDK）
- **渲染**：Canvas API 星空和星座
- **国际化**：EN / ZH / JA / DE

## 与 Welt 的关系

- Welt 承载 geist 哲学理论（六篇文档）
- Portal 承载 encounter 实践（两个空间）
- Lady 是独立于 Portal 的主体（有自己的名字、identity）
- 双向链接：从星野可去 Welt（理解发生了什么），从 Welt 可来 Portal（亲自遇见）
