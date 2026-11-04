<div align="center">

# 🫧 超图实验室

### Hypergraph Lab

**一个人可以属于多个圈子，一件事也可以连接多个对象。**<br>
用可视化与交互，理解两两连接之外的群体关系。

[![在线演示](https://img.shields.io/badge/在线演示-Hypergraph_Lab-5147A5?style=for-the-badge)](https://qqiiseven.github.io/reddit-hypergraph/)
[![前端](https://img.shields.io/badge/前端-HTML_CSS_JavaScript-268EA6?style=for-the-badge)](#快速开始)
[![模型](https://img.shields.io/badge/模型-HGNN%2B_%2F_MLP-DF913B?style=for-the-badge)](#模型与实时预测)

[认识超图](https://qqiiseven.github.io/reddit-hypergraph/index.html#composition) · [应用探索](https://qqiiseven.github.io/reddit-hypergraph/propagation-paper.html) · [研究前沿](https://qqiiseven.github.io/reddit-hypergraph/index.html#frontiers) · [Reddit 社交探索](https://qqiiseven.github.io/reddit-hypergraph/index.html#reddit)

</div>

---

## 关于项目

**超图实验室**是一份数据可视化课程项目，也是一个可以动手探索的超图学习空间。

普通图中的一条边连接两个节点；超图中的一条超边可以连接多个节点。一次共同参加的派对、同一个社区里的用户、一条涉及多个人物和机构的事实，都可以用这样的群体关系来表达。

我们把这些概念做成网页：拖动节点、切换表达、调整参数、点选证据，再对照真实数据中的模型推荐与后续记录。页面以可视化为主，让操作帮助理解结构与任务之间的联系。

> **直接体验：**[打开在线实验室](https://qqiiseven.github.io/reddit-hypergraph/)，浏览静态演示无需安装 Python。自建数据的实时预测需要模型服务在线。

## 在实验室里探索什么？

| 模块 | 从一个问题出发 | 可以动手做什么 |
| :--- | :--- | :--- |
| **01 · 认识超图** | 多个对象如何属于同一关系？ | 对照节点、超边和关联矩阵，探索结构表达 |
| **02 · 超图作用** | 保留群体关系有什么用？ | 理解传播、知识组织、分组与预测等任务 |
| **03 · 应用探索** | 群体作用如何改变传播？事实如何成为回答依据？ | 调整传播参数、观察过程与曲线，联动查看 RAG 证据和原文 |
| **04 · 研究前沿** | 超图正在被用来做什么？ | 体验图片联动、结构采样、事实连接和视觉表达切换 |
| **05 · 派对侦探** | 两两一起玩过，就说明三人曾经同场吗？ | 比较两两连接与共同事件，寻找遗漏的信息 |
| **06 · 森林露营** | 如何给存在重叠关系的朋友分组？ | 尝试划分方案，观察群体关系与分组结果 |
| **07 · Reddit 社交探索** | 圈子如何被同一批人连接？下一期会出现在哪里？ | 探索圈层地图、比较已有预测、输入自己的历史调用模型 |

### ✨ 交互设计

- **同一份关系，多种表达。** 在包络、关联线、矩阵等表示之间切换，理解视觉编码改变了什么。
- **选中一个对象，追踪相关信息。** 让节点、群体、事实角色与原文形成联动，减少在不同视图之间反复查找。
- **先看过程，再看结果。** 通过传播回放、推荐切换和真实记录对照，解释结果从哪里来。
- **把示意与实测说清楚。** 论文结果、教学示例、已保存预测和实时推理分别标注。

## Reddit：从圈层探索到下一期推荐

<div align="center">

**8,000 位匿名用户　·　44 个社区　·　11 个时间窗口　·　每期 28 天**

</div>

| 入口 | 主要内容 | 运行方式 |
| :--- | :--- | :--- |
| [圈层地图](https://qqiiseven.github.io/reddit-hypergraph/index.html#reddit) | 选择 2–10 个社区与时间窗口，查看跨圈参与、重叠矩阵，切换布局并导出 SVG | 浏览器读取已有数据 |
| [自由预测探索](https://qqiiseven.github.io/reddit-hypergraph/index.html#reddit-predict) | 选择用户、预测窗口与方法，对照推荐和真实下一期记录 | 回放已训练结果 |
| [精选案例](https://qqiiseven.github.io/reddit-hypergraph/index.html#reddit-predict/cases) | 用三个用户的群体关系解释模型推荐，并查看同批次整体评估 | 回放已保存案例 |
| [自建数据预测](https://qqiiseven.github.io/reddit-hypergraph/index.html#reddit-custom) | 编辑或导入 JSON，预览历史，调用 HGNN+ 与 MLP 生成 Top 5 推荐 | Python / PyTorch 后端推理 |

**如何建模？** 用户是节点，同一时间窗口内参与同一社区的用户集合是一条超边。一个用户可以同时属于多个超边。

**如何比较？** HGNN+ 结合个人与群体信息，MLP 只看个人特征；已有结果还提供社区重叠与热门基线。新增社区推荐会排除历史中已观察到的社区。

> 圈层地图最多绘制 48 位抽样用户，人数与重叠统计使用完整选定样本。包络面积不表示社区规模或概率，拖动节点只改变位置。精选案例与自由探索来自不同结果批次，指标分别呈现；个例命中不代表模型普遍更好。

## 快速开始

### 方式一：直接在线体验

打开 **[GitHub Pages 演示站](https://qqiiseven.github.io/reddit-hypergraph/)**。概念交互、游戏、传播、RAG 预设证据和已有 Reddit 预测都可以直接浏览。

### 方式二：在本机运行

静态浏览只需要 **Python 3**，无需安装第三方 Python 包，也无需 `npm install`。下面检出当前静态演示使用的部署分支：

```bash
git clone --branch task/github-pages-demo https://github.com/qqiiseven/reddit-hypergraph.git
cd reddit-hypergraph
python3 launch.py
```

启动后会自动打开浏览器，默认地址为 **http://127.0.0.1:4173/**。默认端口占用时，会继续尝试 4174–4183；以终端实际打印的地址为准。保持终端运行，按 `Ctrl+C` 停止。

也可以使用仓库中的启动入口：

| 系统 | 启动文件 |
| :--- | :--- |
| macOS | `START-MAC.command` |
| Windows | `START-WINDOWS.bat` |
| Linux | `START-LINUX.sh` |

请通过 HTTP 服务访问，避免直接双击 HTML 文件导致 JSON 或 Worker 无法加载。

## 模型与实时预测

仓库包含当前公开的 HGNN+ / MLP 权重和必要元数据。**查看已有预测不需要加载模型，只有自建数据实时推理需要安装依赖。**

<details>
<summary><strong>🧠 在本机调用已训练模型</strong></summary>

在仓库根目录创建环境并安装依赖：

```bash
python3.11 -m venv .venv
.venv/bin/python -m pip install -r training/reddit/requirements.lock
python3 launch.py
```

Windows 可使用 `py -3.11 -m venv .venv`，安装依赖时将 Python 路径替换为 `.venv\Scripts\python.exe`。

打开「自建数据预测」，按顺序完成 **编辑历史 → 检查格式与预览 → 调用模型**。无需重新训练或复制原始数据。

- 公开权重位于 `models/reddit/project2-20261102-001/`，由 `models/reddit/default.json` 指定，附带哈希校验和有序社区字典。
- 如果已有激活的本地训练批次，优先使用该批次。
- 自建输入支持 1–100 位用户、1–11 期，大小不超过 256 KiB，使用固定的 44 个社区。
- 所有用户的时间窗口需要对齐。每期填写 `communities` 和 `reply_degree`；无活动期保留空数组与 0。
- `reply_degree` 是每期在各社区内不同回复对象数的总和，排除自己，不是评论条数。
- HGNN+ 在本次提交的用户之间构建超边，不混入原来的 8,000 位用户。输入和输出不会由项目自动保存，也不会触发训练。
- 没有真实下一期标签时，不提供准确率或命中率；排序分数不是概率。

训练、激活与推理的完整步骤见 **[模型训练说明](training/reddit/README.md)**。

</details>

<details>
<summary><strong>🌐 让在线网页调用演示电脑上的模型</strong></summary>

在 macOS 项目目录双击 **`启动在线模型.command`**。脚本会检查依赖和 GitHub 登录，启动模型服务与 Cloudflare 临时隧道，更新网页读取的连接地址，并等待对应 Pages 部署和接口验证完成。

看到启动成功后，终端可以关闭，服务继续在后台运行；**电脑需要保持联网且不休眠**。结束演示时双击 **`停止在线模型.command`**。重启电脑后需要重新启动，没有设置开机自动运行。

换电脑时先准备 `.venv` / PyTorch、Git、`cloudflared` 和已登录的 GitHub CLI，并确保有部署任务分支的推送权限。也可以通过命令行操作：

```bash
.venv/bin/python model_demo.py start
.venv/bin/python model_demo.py stop
```

启动器使用独立临时 checkout，只提交 `dist/model-service.json`，不会上传其他未提交文件或强制推送。临时隧道重启后地址可能变化，脚本负责更新网页连接配置。

服务默认监听 `127.0.0.1:4189`，隧道仅提供模型信息和推理接口，不提供目录或权重下载。浏览器跨域来源限制为演示站，但 CORS 不等于身份认证：知道接口地址的其他客户端仍可能调用。输入上限、单次并发和推理超时限制由服务端执行，演示结束后请停止服务。

状态、PID、部署提交和日志路径记录在被忽略的 `logs/model-demo-state.json`。该方案用于临时演示，不保证持续在线。

</details>

## 实现范围

| 内容 | 项目实际做了什么 |
| :--- | :--- |
| 群体传播与划分 | 在本地运行规则或算法，展示过程、参数与结果 |
| RAG 证据工作台 | 展示预设证据、原文联动与引用的论文数据，不调用大模型 API |
| 研究前沿 | 梳理研究并提供教学示意；结构采样没有运行 SuperHype，表达切换不是模型效果评测 |
| Reddit 已有预测 | 读取导出的历史、推荐与真实记录，不在页面中实时训练 |
| Reddit 自建预测 | 调用已训练权重进行新输入的推理，不将输入加入训练集 |

## 开发与项目结构

前端使用原生 HTML、CSS 和 JavaScript，`dist/` 就是可直接修改、发布的网页目录。

```text
reddit-hypergraph/
├── dist/                       # 静态网页与演示资源
│   ├── app.js                  # 概念与用途交互
│   ├── propagation-paper.html  # 03 应用探索入口
│   ├── hypergraph-rag.*        # RAG 证据工作台
│   ├── frontiers*              # 研究前沿与论文索引
│   ├── reddit-map*             # 圈层地图
│   ├── reddit-forecast*        # 已有预测的自由探索
│   ├── reddit-custom*          # 自建数据与模型调用
│   └── reddit-prediction-graph.* # 多页面共用的推荐超图
├── training/reddit/            # 数据处理、训练、评估与推理
├── models/reddit/              # 已发布权重及元数据
├── tests/                     # JavaScript / Python 检查
├── scripts/                   # 缓存构建、数据校验与导出工具
├── launch.py                  # 本地网页与同源 API
├── serve_model.py             # 独立模型接口服务
└── model_demo.py              # 在线模型演示的启动与停止
```

安装 Node.js 后，可在仓库根目录运行：

```bash
npm test
```

修改网页资源后，更新离线资源清单并再次验证：

```bash
npm run offline:build
npm test
```

在已安装训练依赖的环境中运行 Python 检查：

```bash
.venv/bin/python -m unittest discover -s tests -p 'test_reddit_*.py' -v
.venv/bin/python -m unittest discover -s tests -p 'test_model_*.py' -v
```

<details>
<summary><strong>📦 数据导出与离线使用</strong></summary>

部署分支包含已经获准公开的配套文件：`dist/reddit-network.json` 和 `dist/reddit-predictions.json`。地图与预测无需重新生成即可浏览，两个文件应配套更新。

如需从原项目重新导出：

```bash
python3 scripts/prepare-reddit-map.py --source /path/to/old-project/dist/data.json
python3 scripts/prepare-reddit-predictions.py \
  --network-source /path/to/old-project/dist/data.json \
  --predictions /path/to/old-project/dist/predictions.json
node scripts/verify-reddit-publication.cjs
```

地图导出保留匿名用户、社区、窗口与归属记录；预测导出绑定用户、社区顺序和来源哈希。发布检查会核对真实新增记录与推荐合法性。

完整预测包含 P07→P08 验证期，以及 P08→P09、P09→P10、P10→P11 测试期。自由探索与精选案例来自不同批次，应分别查看对应指标。

网页支持离线资源缓存。两个 Reddit 数据文件需要先成功载入，之后才会缓存；离线浏览不意味着远程模型接口也能离线使用。模型服务地址不加入离线缓存。

原始数据、密钥、环境配置、日志、生成报告和临时预览不纳入 Git。新增公开数据前应确认发布范围、运行校验并审查差异。

</details>

<details>
<summary><strong>🚀 GitHub Pages 部署</strong></summary>

仓库通过 [Pages 工作流](.github/workflows/pages.yml) 发布 Git 中的 `dist/`。

1. 在仓库 **Settings → Pages** 中选择 **GitHub Actions**。
2. 若 `github-pages` 环境限制部署分支，允许 `task/github-pages-demo`，保留已有审批规则。
3. 将确认需要发布的改动同步到该部署分支。推送会触发验证和部署。
4. 查看 Actions 运行结果；摘要包含准确提交 SHA 和网站地址。

工作流会运行 JavaScript 测试、模型网关相关 Python 检查及 Reddit 发布校验。手动触发入口需要工作流先存在于默认分支。

Pages 只托管静态资源，不运行 Python / PyTorch 后端，也不上传本地环境或未跟踪文件。自建数据推理需要另行启动模型服务。

</details>

## 操作与研究资料

- [网页操作手册](https://qqiiseven.github.io/reddit-hypergraph/manual.html)
- [本地启动说明](先读我.txt) · [趣味版游玩说明](趣味版游玩说明.md)
- [03 应用探索修改指南](EDIT-03.txt)
- [Reddit 模型训练与数据说明](training/reddit/README.md)
- [研究前沿与论文索引](https://qqiiseven.github.io/reddit-hypergraph/index.html#frontiers)

论文图表、教学示例和项目结果的出处及适用范围在相应页面标注。字体的许可文件保留在 [`dist/fonts/`](dist/fonts/)。

---

<div align="center">

**Hypergraph Lab · 超图实验室**<br>
看见群体关系，也动手探索它们。

[打开实验室 ↗](https://qqiiseven.github.io/reddit-hypergraph/)

</div>
