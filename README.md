# 超图实验室 · v2

用交互网页理解超图：结构与关联矩阵、共同事件、群体传播、RAG 证据、派对侦探、森林露营划分实验和 Reddit 社交探索。

默认分支 `task/reddit-hypergraph` 的 v2 包含 07 Reddit 社交页面及缓存修复。`training/reddit/` 包含数据处理、HGNN+ / MLP 训练和推理；`models/reddit/` 随仓库提供当前训练权重与必要元数据；完整步骤见 [训练说明](training/reddit/README.md)。网页浏览不需要安装训练依赖。

## 运行

### GitHub Pages 在线演示

`.github/workflows/pages.yml` 发布 Git 中的 `dist/` 静态资源。仓库需先在 Settings → Pages 将 Source 设为 GitHub Actions。

首次部署通过推送 `task/github-pages-demo` 分支触发，不需要修改默认分支。工作流先运行 `npm test`，再部署检出的准确提交，并在运行摘要中记录 commit SHA 和网站地址。`workflow_dispatch` 只有在工作流进入默认分支后才会显示手动入口；本配置同时保留该入口供以后使用。

若 Settings → Environments → github-pages 限制了可部署分支，需要允许 `task/github-pages-demo`。保留已有的环境审批规则，按 GitHub 的提示完成部署审批。

概念交互、派对侦探、森林露营、传播模拟、RAG 预设证据和 Reddit 完整地图、自由预测探索及精选案例可直接在浏览器使用。地图入口为 `index.html#reddit`，完整预测入口为 `index.html#reddit-predict`。2026-11-03 经用户明确授权，部署分支公开配套的 `dist/reddit-network.json` 和 `dist/reddit-predictions.json`，与本机使用同一份导出。完整预测是已训练结果的回放，不需要在线加载模型权重；自建数据的实时预测仍需本机 Python/PyTorch 后端，GitHub Pages 不提供模型 API。

部署只上传全新 Git 检出中的 `dist/`，包含上述两个已批准的公开数据文件。部署前运行 `node scripts/verify-reddit-publication.cjs`，核对匿名用户标识、用户与社区顺序、来源绑定、所有窗口的真实新增记录和推荐合法性，并记录文件 SHA-256。原始数据、其他被忽略的数据、日志、配置和模型环境不随网站发布。未来更新网站时，将需要发布的代码同步到部署任务分支，检查差异后推送；不需要推送主分支。

浏览静态页面需要 Python 3，无第三方运行依赖；“自建数据预测”另外使用 project2 的 `.venv`、PyTorch；当前训练好的权重已包含在仓库中：

```bash
git clone https://github.com/qqiiseven/reddit-hypergraph.git
cd reddit-hypergraph
python3 launch.py
```

默认打开 http://127.0.0.1:4173/ ，端口占用时自动尝试 4174–4183。Windows 可双击 `START-WINDOWS.bat`。不要直接双击 HTML，JSON 加载及 Worker 需要本地 HTTP 服务。

## 使用已训练模型

首次克隆后，在仓库根目录安装推理依赖，再启动页面：

```bash
python3.11 -m venv .venv
.venv/bin/python -m pip install -r training/reddit/requirements.lock
python3 launch.py
```

打开「07 Reddit 社交 → 自建数据预测」即可编辑示例并调用 HGNN+ / MLP，无需重新训练或复制原始数据。Windows 对应使用 `.venv\Scripts\python.exe` 安装依赖。

当前公开权重位于 `models/reddit/project2-20261102-001/`，两份合计约 165 KiB，带 SHA-256 校验和有序社区字典。有已激活的本地训练批次时，优先使用该批次；否则使用 `models/reddit/default.json` 指定的公开权重。

部署分支另行提供完整圈层地图和自由探索使用的 8,000 人历史与配套预测导出。这两个 JSON 不属于模型包，静态网页直接读取它们，无需安装推理依赖。

## 源码与验证

- `dist/`：可直接修改的 HTML、CSS、JavaScript，以及页面所需的小型教学数据、论文图表和字体。
- `dist/app.js`：首页概念与用途交互；`dist/hypergraph-rag.js`：RAG 证据展示。
- `dist/lab.js`、`dist/party.js`：结构工作台与派对侦探。
- `dist/partition.js`、`dist/partition-model.js`：森林露营界面与划分算法。
- `dist/reddit.js`、`dist/reddit-data.js`：07 Reddit 社交（`index.html#reddit`），复用首页布局，展示已有真实案例、模型预测对比和整体评估；目前为导出结果回放，不进行实时训练或社交行为模拟。超边沿用 01 的成员包围轮廓，节点可拖动或用方向键移动，支持恢复布局；`dist/reddit-graph-model.js` 单独管理位置，保持真实成员关系不变。
- `dist/reddit-map.js`、`dist/reddit-map-model.js`、`dist/reddit-map.css`：07 默认的圈层地图，迁入原版的社区选择、三种布局、两种画面取样、包络／辅助曲线开关、重叠矩阵与 SVG 导出。支持全部 2–10 个选中社区，节点可拖动，缩放仅使用按钮；“下一期预测”内的精选案例在 `index.html#reddit-predict/cases`。
- `dist/reddit-forecast.js`、`dist/reddit-forecast-model.js`、`dist/reddit-forecast.css`：`index.html#reddit-predict` 的完整下一期预测；可从地图点击用户跳入，选择用户、四个已保存窗口和四种方法，先看推荐再揭晓真实下一期。该页包含“自由探索”和“精选案例”两种浏览方式；原版三个案例及其评估在精选案例中保留，两批导出的模型结果分别标注。旧 `#reddit-cases` / `#reddit-results` 链接自动跳转至合并页。
- `dist/reddit-custom.js`、`dist/reddit-custom-model.js`、`dist/reddit-custom.css`：`index.html#reddit-custom` 的自建数据预测，提供 JSON 模板、导入、字段说明、历史预览和实时 HGNN+ / MLP 对比；`reddit_api.py` 与 `training/reddit/custom_predict.py` 负责本机权重调用。
- `dist/reddit-prediction-graph.js`、`dist/reddit-prediction-graph.css`：下一期预测、自建预测和预测案例共用的推荐超图。节点是实际输入用户，实线表示最近一期的已知社区归属，橙色虚线表示观察用户可能新增的归属；点击 Top 5 社区切换，分数可展开查看。支持拖动节点和方向键移动，轮廓与遮罩同步更新；每个候选社区单独保留当前浏览中的布局，可恢复默认位置。只展示最多 3 个已参与社区和 9 位其他用户，不改变模型输入或预测。案例图的其他用户仅来自原有讲解子集。
- `tests/`：模型、传播、划分、游戏和离线资源测试。
- `scripts/`：缓存构建、论文数据提取、报告和提交包生成工具。

安装 Node.js 后运行 `npm test`；当前 50 项测试通过。训练环境中运行 `.venv/bin/python -m unittest discover -s tests -p 'test_reddit_*.py' -v`，当前本机另有 22 项 Python 检查通过。修改网页后运行 `npm run offline:build` 更新离线缓存，再运行测试。运行网页无需 npm install。

## 圈层地图与下一期预测的数据

部署分支已包含获准公开的配套导出，无需重新生成。原始 `data.json` 和训练资料继续保留在本地。需要从旧项目重新导出时运行：

```bash
python3 scripts/prepare-reddit-map.py --source /path/to/old-project/dist/data.json
```

脚本只导出匿名用户标识、社区、窗口和归属记录到 `dist/reddit-network.json`，并记录源文件 SHA-256。也可在地图缺少数据时直接通过页面载入旧 `data.json` 或该导出文件。网页不会下载原始归档或重新训练模型。

有旧项目完整预测文件时，再运行：

```bash
python3 scripts/prepare-reddit-predictions.py --network-source /path/to/old-project/dist/data.json --predictions /path/to/old-project/dist/predictions.json
```

该脚本将已有预测与原始用户、社区顺序及文件哈希绑定，生成 `dist/reddit-predictions.json`。页面校验对应的数据哈希、历史排除和真实下一期记录；缺少预测文件时可手动载入该导出。需要配套的 `reddit-network.json`。完整预测包含 P07→P08 验证期及 P08→P09、P09→P10、P10→P11 测试期，四种方法为 HGNN+、MLP、社区重叠及热门基线。

当前公开的完整导出与保留的三个案例属于不同批次，因此各自使用配套指标，不覆盖旧结果。筛选命中或未命中属于事后探索，不改变完整测试集评估。这一页回放训练好的预测；另一个“自建数据预测”标签实时调用保存的权重。

## 自建数据预测

用更新后的 `python3 launch.py` 启动，然后打开 `index.html#reddit-custom`。若已经开着旧版静态服务，需要重启。页面提供可编辑示例、模板下载、JSON 文件导入、逐字段说明和 44 个支持社区的列表。

输入由 `schema_version: 1`、`period_days: 28`、`users` 三部分组成。每位用户包含唯一 `id` 与按时间排列的 `history`；每一期包含社区名称数组 `communities` 和非负整数 `reply_degree`。所有用户期数一致，无活动期填写空数组和 0。支持 1–100 位用户、1–11 期、最多 256 KiB；社区名称大小写须与权重的固定字典一致。回复度数是该用户每期在各社区中不同回复对象数量之和，排除自己，不是评论条数，不能省略或自动补值。

点击“检查格式与预览”后再“调用模型”，服务器会从本机权重计算两种方法的 Top 5，排除历史社区，结果可按用户切换和下载。HGNN+ 仅在这次提交的用户之间建立社区–窗口超边，不混入原来的 8,000 位用户；MLP 只看个人特征。小规模自建数据的效果未经测试集验证，分数不是概率。没有真实下一期标签，所以不提供准确率或命中率。

接口只监听本机 `127.0.0.1`：`GET /api/reddit/model` 返回当前权重批次、社区列表和模板；`POST /api/reddit/predict` 接收上述 JSON。输入和输出不自动保存、不写入训练数据、不触发训练；可通过页面下载保存。模型不可用时显示实际错误，原来的圈层地图、已保存预测和案例仍可使用。

地图的社区人数和 Jaccard 使用完整选定样本；最多 48 个绘图节点是显示取样，不影响统计。数据文件不属于安装离线缓存的必需资源；通过网站或本地服务成功载入后，才缓存相应数据或预测文件以供离线使用。两个文件必须配套更新；替换公开导出前需核对发布范围，运行发布校验并审查 Git 差异。

传播与划分算法在本地执行；RAG 页面展示预设证据和论文数据，不调用模型 API、不重跑论文训练。原始数据、环境配置、密钥、日志、生成报告和临时预览不纳入版本管理。

详细操作见 `先读我.txt`、`趣味版游玩说明.md` 和网页中的操作文档。旧说明提到的 `output/` 报告、`preview/` 截图为本地产物，不随 Git 克隆提供；报告生成需要另行准备截图及 Python 依赖。
