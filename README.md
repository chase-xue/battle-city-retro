# 🎮 经典《坦克大战》（Battle City）复刻版

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License MIT">
  <img src="https://img.shields.io/badge/Platform-Web%20%7C%20WeChat%20%7C%20Android-brightgreen.svg" alt="Platforms">
  <img src="https://img.shields.io/badge/Android-APK%20Build-green.svg" alt="Android APK">
  <img src="https://img.shields.io/badge/Rendering-HTML5%20Canvas%202D-orange.svg" alt="Canvas 2D">
  <img src="https://img.shields.io/badge/Audio-Web%20Audio%20API-yellow.svg" alt="Web Audio">
  <img src="https://img.shields.io/badge/Dependencies-Zero-success.svg" alt="Zero Dependencies">
</p>

> **原汁原味 FC 红白机童年经典！**
> 纯原生 JavaScript 实现，**零外部图片、零外部音频依赖**。所有像素精灵均由 Canvas 算法代码逐像素绘制，所有 8-bit 复古音效均由 Web Audio API 芯片级实时合成。
> 支持 **PC 浏览器**、**手机端触控** 与 **微信小程序 / 微信小游戏** 双端完美运行。

---

## 🕹️ 在线试玩 (Live Demo)

- 网页版通过 GitHub Pages 自动部署，直接在浏览器中畅玩：  
  👉 **[https://chase-xue.github.io/battle-city-retro/](https://chase-xue.github.io/battle-city-retro/)**

---

## ✨ 核心特性

1. **🎨 零资源体积 · 纯 Canvas 像素级绘制**：
   - 绝无任何图片加载等待，Canvas 原生手绘经典金色老鹰司令部、被摧毁骷髅残骸、红白闪烁掉宝坦克、爆炸粒子与出生星芒。
2. **🔊 芯片级 8-bit 复音合成器**：
   - 基于 Web Audio API（方波与滤波白噪声），无需 MP3/WAV 资源，原汁原味复刻开场经典 BGM、开炮、爆炸、击中铁块敲击声与吃道具音效。
3. **🧱 26×26 微网格精准地形破坏机制**：
   - **砖墙**：微网格 4 分格破坏，可打出各种缺口与弹道通道。
   - **铁墙**：普通子弹无效，仅玩家满级破铁重炮可击碎。
   - **水流**：隔绝坦克通行，子弹可自由穿过。
   - **森林**：坦克驶入隐蔽遮挡。
   - **冰面**：产生物理滑行惯性。
4. **🎖️ 玩家 4 级升级形态**：
   - 初始单发 $\to$ 2级快弹 $\to$ 3级连发双炮 $\to$ 4级破铁重炮，出生自带闪烁无敌护盾。
5. **🤖 4 大经典敌方军团 AI**：
   - 普通装甲兵、高速突击车、强力速射炮、4 发高抗性重装装甲车，具备战略下移攻击基地倾向。
6. **🌟 7 大经典掉落道具**：
   - 🌟 **五角星**：火力升级
   - 💣 **手雷**：全屏消灭在场敌军
   - ⏰ **时钟**：全场敌军定身 10 秒
   - ⛏️ **铁锹**：老鹰司令部周围筑起坚固铁墙防线
   - 🛡️ **头盔**：获得时效无敌护盾
   - 🎖️ **奖命坦克**：增加 1 条生命
   - 🔫 **手枪**：瞬间满级终极形态
7. **📱 移动端与微信原生适配**：
   - 黄金比例竖屏街机视口，内置对称 3×3 九宫格复古街机十字方向键与开火按键。
   - 支持微信硬件触感短震动反馈（`wx.vibrateShort`）与右上角分享转发。

---

## 🚀 快速启动指南

### 方式一：浏览器本地直接试玩（最简单快速）

项目为标准纯原生网页实现，使用任意本地静态服务器即可启动：

```bash
# 方式 1：使用 Python 内置服务器
python3 -m http.server 8080

# 方式 2：使用 Node.js / npm
npx serve .
# 或
npm start
```

启动后在浏览器打开 `http://localhost:8080` 即可开始游戏！

#### ⌨️ PC 键盘按键：
| 按键 | 功能 |
| :--- | :--- |
| `W` `A` `S` `D` 或 方向键 `↑` `←` `↓` `→` | 移动坦克 |
| `J` 或 `Space`（空格） | 开火射击 |
| `Enter`（回车）或 鼠标点击 | 开始游戏 / 重新开始 |

---

### 方式二：导入微信开发者工具运行

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 打开微信开发者工具，点击 **“导入项目”**。
3. 选择当前项目根目录。
4. AppID 可以选择 **“测试号”** 或填入你自己的小程序/小游戏 AppID，后端服务选择 **“不使用云服务”**。
5. 点击导入即可在模拟器中即时运行并扫码真机预览。

---

### 方式三：Android 安卓手机安装（GitHub Actions 自动化构建）

本项目已集成 Android 原生微容器打包与 GitHub Actions 云端自动构建：

1. **从 GitHub 直接下载 APK 安装**：
   - 代码推送到 GitHub 后，点击仓库上方的 **Actions** 标签页；
   - 选择 **Build Android APK** 工作流，点击最新的运行记录；
   - 在底部的 **Artifacts** 区域即可直接下载 `Tank-BattleCity-Android-APK`（解压即得到 `.apk` 安装包，可直接发送到安卓手机安装运行）。
   - *（若发布了 GitHub Release，APK 也会自动挂载至 Release 附件供随时下载）*。

2. **本地 Android 构建**：
   ```bash
   cd android
   # 生成并在真机/模拟器安装 Debug APK
   ./gradlew assembleDebug
   # 生成物位于 android/app/build/outputs/apk/debug/
   ```

---

## 📂 项目结构

```text
tank/
├── .github/
│   └── workflows/
│       ├── build-android.yml # GitHub Actions Android APK 自动打包
│       └── deploy-pages.yml  # GitHub Pages 自动化在线试玩部署
├── android/                  # Android 原生容器工程（Gradle 构建）
│   ├── app/
│   │   ├── build.gradle      # 子模块配置与 Web 资源自动同步脚本
│   │   └── src/main/         # AndroidManifest 与原生沉浸式全屏 WebView
│   ├── build.gradle          # 根工程构建脚本
│   ├── gradle.properties     # JVM 与 AndroidX 配置
│   └── settings.gradle       # 模块依赖配置
├── pages/
│   └── index/                # 微信小程序自包含页面（WXML/WXSS/JS/JSON）
├── src/                      # 模块化游戏核心引擎
│   ├── audio.js              # 8-bit Web Audio 声音合成器
│   ├── bullet.js             # 子弹飞行与弹道系统
│   ├── constants.js          # 地图、尺寸、敌我属性常量
│   ├── controller.js         # 键盘、触控与虚拟摇杆控制器
│   ├── effect.js             # 爆炸与出生粒子管理器
│   ├── engine.js             # 游戏主循环、状态机与渲染流水线
│   ├── levels.js             # 关卡数据与敌军波次编队
│   ├── map.js                # 26x26 微网格地形与破坏碰撞检测
│   ├── powerup.js            # 道具掉落与拾取机制
│   ├── sprites.js            # Canvas 纯代码像素画手绘渲染器
│   └── tank.js               # 玩家坦克与敌军 AI 坦克实体
├── .gitignore                # Git 忽略配置（过滤本地配置、缓存与构建产物）
├── LICENSE                   # MIT 开源授权协议
├── README.md                 # 项目详细说明文档
├── app.js / app.json         # 微信小程序入口与视口配置
├── game.js                   # Web / 单文件打包轻量运行入口
├── index.html                # 浏览器试玩 HTML 容器
├── package.json              # 项目依赖与便捷启动脚本
└── project.config.json       # 微信小程序基础项目配置
```

---

## 🚢 部署与推送到 GitHub

按如下步骤推送到你的 GitHub 仓库：

```bash
# 1. 关联远程仓库地址
git remote add origin https://github.com/chase-xue/battle-city-retro.git

# 2. 推送主分支代码
git push -u origin main
```

推送成功后：
1. 进入 GitHub 仓库设置：**Settings** $\to$ **Pages**。
2. 在 **Build and deployment** 下方的 **Source** 选择 **GitHub Actions**。
3. 稍等片刻，GitHub Actions 就会自动将网页版部署到公网，所有人即可直接在线畅玩！
4. 点击 **Actions** $\to$ **Build Android APK** 即可下载最新编译的安卓安装包（APK）！

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 协议开源，欢迎自由体验、学习与二次创作。
