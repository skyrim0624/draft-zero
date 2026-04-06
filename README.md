# DoitDoit

> 打破完美主义的行动力引擎。
> 一个帮你在 30 分钟内从「想到」走到「做到」的强制限时工具。

## 它解决什么问题？

你一定经历过这样的时刻：脑子里蹦出一个很棒的点子——拍个视频、写篇文章、画个原型图——那一刻你觉得自己无所不能。然后你说"我先上个厕所"，顺手打开手机，短视频一刷就是半小时。等你放下手机，那股冲劲已经过去了。

DoitDoit 不治"不想做"——那是欲望问题，是人性问题，没有工具能解决。它治的是：**你明明想做，但总习惯性拖延**。

## 核心机制

**「我要在 ___ 分钟内，做完 ___！」**

输入任务，按下开始，就是签下了一份不可撤回的契约。没有暂停键——因为时间本身不可暂停。你只有两个选择：在限定时间内交出一个东西，或者承认你什么也做不了。

## 设计理念

- **先完成，再完美** — 一个写满错别字的大纲，比一个完美的空白页有价值一万倍
- **多巴胺劫持** — 完成任务后的彩纸爆炸让你的快感回路绑定到行动上
- **完美主义疫苗** — 对"不够好"的遗憾，让你永远停在起跑线上

## 截图

<p align="center">
  <img src="public/icon.png" width="128" alt="DoitDoit Icon" />
</p>

## 安装

### 直接下载（推荐）

前往 [Releases](https://github.com/LovIce4ev/draft-zero/releases) 页面，下载最新的 `.dmg` 文件，双击安装即可。

> ⚠️ 当前仅支持 Apple Silicon (M1/M2/M3/M4) Mac。

### 从源码构建

```bash
git clone https://github.com/LovIce4ev/draft-zero.git
cd draft-zero
npm install
npm run package
# 安装包在 release/ 目录下
```

## 使用方式

1. 安装后，DoitDoit 常驻在顶部菜单栏
2. **点击菜单栏图标**唤出窗口
3. 填写任务名称和时间，点击开始
4. 倒计时结束后，诚实回答：做完了吗？
5. 再点击菜单栏图标收起，继续你的工作

## 技术栈

- **Electron** + **React** + **TypeScript**
- **Vite** 构建
- **electron-builder** 打包
- 手绘风格 UI，纯 CSS 动画

## 开发

```bash
# 启动开发环境
npm run dev

# 构建生产版本
npm run build

# 打包 .dmg 安装包
npm run package
```

## License

MIT
