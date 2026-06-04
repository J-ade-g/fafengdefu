# 发疯得福 · Emotion Paper Ball

**情绪释放 Web App** —— 把你的情绪揉成纸团，扔出去，然后笑着转发。

[在线体验](https://fafengdefu.vercel.app)

---

## 一句话说清

面向被生活压榨的年轻人，在情绪崩溃想发泄时，通过「AI 嘴替帮你骂」或「暴走互动直接发泄」两条路径，配合波普贴纸画风、机械循环 BGM 和 AI 棒读配音，用荒诞又上头的方式消解情绪并忍不住裂变出去的产物。

---

## 为什么做

受众是 18–35 岁的打工人和大学生。他们在被甲方折磨、加班到崩溃、社交疲惫时，需要一个不伤人的发泄出口。他们日常在微博写「发疯文学」、在微信群刷抽象表情包、用丑东西和贴纸来表达情绪 —— 粗糙、波普、不精致本身就是他们的审美和态度。

两个核心洞察：

1. **很多人想骂但不会骂、不敢骂。** AI 嘴替恰好填补这个缺口：「窝囊负鼠」替你说碎碎念式自嘲，「发疯吗喽」替你输出攻击性阴阳怪气。然后 AI 用毫无感情的棒读把这段话念出来 —— 一本正经念疯话的反差感，本身就是笑点。

2. **情绪发泄天然有分享冲动。** 「这个吐槽太好笑了」「AI 念这段话的声音太离谱了」。市面上没有产品把发泄和裂变结合起来，发疯得福让每次发泄都成为忍不住转发的段子。

---

## 核心功能

### 功能 1 — 嘴替：AI 帮你骂

用户输入抱怨，AI 以角色口吻扩写成好笑的发疯文学，再用毫无感情的棒读念出来。文字好笑 + 棒读的反差感 = 强烈转发冲动。

**流程：**
1. 在纸上输入抱怨（支持快捷气泡填入，如「我的电量只剩 1%」「老板画的饼够我吃三辈子」）
2. 选择角色：**窝囊负鼠**（认命碎碎念、谐音梗自嘲）或 **发疯吗喽**（攻击性阴阳怪气）
3. DeepSeek 按角色人设生成吐槽，打字机动效逐字打在纸上，同时 AI 棒读语音播放
4. 写完后选择破坏方式发泄，最终进入盲盒

<div align="center">
  <img src="https://raw.githubusercontent.com/J-ade-g/fafengdefu/main/assets/img/home-main.png" width="200" alt="首页">
  <img src="https://raw.githubusercontent.com/J-ade-g/fafengdefu/main/assets/img/mouth.png" width="200" alt="嘴替">
</div>

### 功能 2 — 毁掉：亲手破坏发泄

把情绪具象化到纸上，让用户亲手毁掉，完成「写 → 毁 → 翻篇」的仪式感。

**三种破坏方式：**

| 方式 | 效果 |
|---|---|
| 一把火烧了 | 纸张燃烧 + 灰烬粒子 |
| 碎纸机碎了它 | 纸张旋转卷入 + 碎片四散 |
| 液压机压死它 | 纸张压扁 + 裂纹扩散 |

<div align="center">
  <img src="https://raw.githubusercontent.com/J-ade-g/fafengdefu/main/assets/img/fire-icon.png" width="80" alt="烧掉">
  <img src="https://raw.githubusercontent.com/J-ade-g/fafengdefu/main/assets/img/shredder.png" width="80" alt="碎纸机">
  <img src="https://raw.githubusercontent.com/J-ade-g/fafengdefu/main/assets/img/press-icon.png" width="80" alt="液压机">
</div>

### 功能 3 — 暴走：身体互动发泄

不想写字时，直接通过身体互动发泄，同样通向盲盒。

**三种暴走方式：**
- **旋转跳跃** — 长按地球让角色疯狂旋转后飞出
- **暴锤地球** — 反复点击砸至地球碎裂
- **统治世界** — 长按或喊出声，僵尸从底部涌上地球

<div align="center">
  <img src="https://raw.githubusercontent.com/J-ade-g/fafengdefu/main/assets/img/tap.png" width="80" alt="点击">
  <img src="https://raw.githubusercontent.com/J-ade-g/fafengdefu/main/assets/img/longpress.png" width="80" alt="长按">
  <img src="https://raw.githubusercontent.com/J-ade-g/fafengdefu/main/assets/img/hammer.png" width="80" alt="锤">
</div>

### 功能 4 — 离谱盲盒：裂变终点

发泄的终点不是空白，是一张让人忍不住转发的结果卡片。在用户发泄的同时 AI 已在后台异步生成盲盒内容，以卡片翻转动画揭晓。

**盲盒类型：**
- **离谱处方笺** — 如「出门左转钻进垃圾桶」「把工牌埋在公司花盆里」
- **反向许愿签** — 「愿你讨厌的人明天网速卡成 PPT」
- **灵魂碎片** — 你的暴躁值超过了 XX% 的打工人
- **命定之人** — AI 为你匹配的精神搭子

波普风格卡片 + 抽象贴纸设计，带保存和分享按钮，用户一键转发带别人一起玩。

<div align="center">
  <img src="https://raw.githubusercontent.com/J-ade-g/fafengdefu/main/assets/img/share-card-1.png" width="180" alt="盲盒卡片">
  <img src="https://raw.githubusercontent.com/J-ade-g/fafengdefu/main/assets/img/share-card-2.png" width="180" alt="盲盒卡片">
</div>

---

## 技术实现

| 层 | 技术 |
|---|---|
| 前端 | HTML + CSS + vanilla JavaScript（无框架依赖） |
| 3D 折纸 | CSS 3D Transforms（折叠、翻转、飞行动画） |
| 破坏特效 | Canvas API（燃烧粒子、碎片、撕裂动效） |
| 动画引擎 | GSAP |
| AI 生成 | DeepSeek API（按角色人设生成吐槽 + 异步生成盲盒） |
| 语音合成 | Web Speech API / 外部 TTS（AI 棒读配音） |
| 音频 | Howler.js（BGM + 音效管理） |

---

## 设计哲学

> 情绪不需要被「管理」，需要被「释放」。
> 中国传统中「碎碎平安」—— 破坏可以是祝福。

不做又一个冥想 App。做第一个让你理直气壮发疯的产品。

波普贴纸画风贯穿始终：粗糙、不精致、有态度。和受众日常消费的抽象表情包、丑东西、发疯文学是同一套审美语言。

---

## 本地运行

```bash
# 直接在浏览器中打开
open index.html

# 或用静态服务器
npx serve .
python -m http.server
```

纯前端项目，无构建步骤。AI 生成需要配置 DeepSeek API Key。

---

## 未来规划

**近 3 个月：**
- 增加暴走模式数量，丰富互动玩法
- 增加嘴替角色，引入经典情境模板（情侣分手、甄嬛传等）
- 补充更多快捷气泡

**中长期：**
- 用户系统：收藏自己的嘴替金句和盲盒结果
- 落地为微信小程序 + 抖音小程序
- 广告/订阅/单次付费模式探索

---

## License

MIT
