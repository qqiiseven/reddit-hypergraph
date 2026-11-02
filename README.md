# 超图实验室 · v2

用交互网页理解超图：结构与关联矩阵、共同事件、群体传播、RAG 证据、派对侦探和森林露营划分实验。

本分支 `v2/hypergraph-lab` 从 Reddit 数据分析版本的提交 `1d2c3a1ddb6aa074c3a53b3796bd10c6f7b61a7c` 延续。旧版保留在 `task/reddit-hypergraph` 分支。v2 侧重概念教学与交互实验，不包含旧版 Reddit 数据处理和 HGNN+ 训练流程。

## 运行

需要 Python 3，无第三方运行依赖：

```bash
git clone --branch v2/hypergraph-lab https://github.com/qqiiseven/reddit-hypergraph.git
cd reddit-hypergraph
python3 launch.py
```

默认打开 http://127.0.0.1:4173/ ，端口占用时自动尝试 4174–4183。Windows 可双击 `START-WINDOWS.bat`。不要直接双击 HTML，JSON 加载及 Worker 需要本地 HTTP 服务。

## 源码与验证

- `dist/`：可直接修改的 HTML、CSS、JavaScript，以及页面所需的小型教学数据、论文图表和字体。
- `dist/app.js`：首页概念与用途交互；`dist/hypergraph-rag.js`：RAG 证据展示。
- `dist/lab.js`、`dist/party.js`：结构工作台与派对侦探。
- `dist/partition.js`、`dist/partition-model.js`：森林露营界面与划分算法。
- `tests/`：模型、传播、划分、游戏和离线资源测试。
- `scripts/`：缓存构建、论文数据提取、报告和提交包生成工具。

安装 Node.js 后运行 `npm test`；当前 32 项测试通过。修改网页后运行 `npm run offline:build` 更新离线缓存，再运行测试。运行网页无需 npm install。

传播与划分算法在本地执行；RAG 页面展示预设证据和论文数据，不调用模型 API、不重跑论文训练。原始数据、环境配置、密钥、日志、生成报告和临时预览不纳入版本管理。

详细操作见 `先读我.txt`、`趣味版游玩说明.md` 和网页中的操作文档。旧说明提到的 `output/` 报告、`preview/` 截图为本地产物，不随 Git 克隆提供；报告生成需要另行准备截图及 Python 依赖。
