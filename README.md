# 超图实验室 · v2

用交互网页理解超图：结构与关联矩阵、共同事件、群体传播、RAG 证据、派对侦探、森林露营划分实验和 Reddit 社交探索。

默认分支 `task/reddit-hypergraph` 的 v2 包含 07 Reddit 社交页面及缓存修复。当前任务分支新增 `training/reddit/`，把原版数据处理、HGNN+ / MLP 训练和权重推理迁入 project2；完整步骤见 [训练说明](training/reddit/README.md)。网页浏览不需要安装训练依赖。

## 运行

浏览静态页面需要 Python 3，无第三方运行依赖；“自建数据预测”另外使用 project2 的 `.venv`、PyTorch 和本地训练权重：

```bash
git clone https://github.com/qqiiseven/reddit-hypergraph.git
cd reddit-hypergraph
python3 launch.py
```

默认打开 http://127.0.0.1:4173/ ，端口占用时自动尝试 4174–4183。Windows 可双击 `START-WINDOWS.bat`。不要直接双击 HTML，JSON 加载及 Worker 需要本地 HTTP 服务。

## 源码与验证

- `dist/`：可直接修改的 HTML、CSS、JavaScript，以及页面所需的小型教学数据、论文图表和字体。
- `dist/app.js`：首页概念与用途交互；`dist/hypergraph-rag.js`：RAG 证据展示。
- `dist/lab.js`、`dist/party.js`：结构工作台与派对侦探。
- `dist/partition.js`、`dist/partition-model.js`：森林露营界面与划分算法。
- `dist/reddit.js`、`dist/reddit-data.js`：07 Reddit 社交（`index.html#reddit`），复用首页布局，展示已有真实案例、模型预测对比和整体评估；目前为导出结果回放，不进行实时训练或社交行为模拟。超边沿用 01 的成员包围轮廓，节点可拖动或用方向键移动，支持恢复布局；`dist/reddit-graph-model.js` 单独管理位置，保持真实成员关系不变。
- `dist/reddit-map.js`、`dist/reddit-map-model.js`、`dist/reddit-map.css`：07 默认的圈层地图，迁入原版的社区选择、三种布局、两种画面取样、包络／辅助曲线开关、重叠矩阵与 SVG 导出。支持全部 2–10 个选中社区，节点可拖动，缩放仅使用按钮；预测案例在 `index.html#reddit-cases`。
- `dist/reddit-forecast.js`、`dist/reddit-forecast-model.js`、`dist/reddit-forecast.css`：`index.html#reddit-predict` 的完整下一期预测；可从地图点击用户跳入，选择用户、四个已保存窗口和四种方法，先看推荐再揭晓真实下一期。原版三个案例及其评估保留在“预测案例”，两批导出的模型结果分别展示。
- `dist/reddit-custom.js`、`dist/reddit-custom-model.js`、`dist/reddit-custom.css`：`index.html#reddit-custom` 的自建数据预测，提供 JSON 模板、导入、字段说明、历史预览和实时 HGNN+ / MLP 对比；`reddit_api.py` 与 `training/reddit/custom_predict.py` 负责本机权重调用。
- `dist/reddit-prediction-graph.js`、`dist/reddit-prediction-graph.css`：下一期预测、自建预测和预测案例共用的推荐超图。节点是实际输入用户，实线表示最近一期的已知社区归属，橙色虚线表示观察用户可能新增的归属；点击 Top 5 社区切换，分数可展开查看。只展示最多 3 个已参与社区和 9 位其他用户，不改变模型输入或预测。案例图的其他用户仅来自原有讲解子集。
- `tests/`：模型、传播、划分、游戏和离线资源测试。
- `scripts/`：缓存构建、论文数据提取、报告和提交包生成工具。

安装 Node.js 后运行 `npm test`；当前 49 项测试通过。训练环境中运行 `.venv/bin/python -m unittest discover -s tests -p 'test_reddit_*.py' -v`，当前本机另有 17 项 Python 检查通过。修改网页后运行 `npm run offline:build` 更新离线缓存，再运行测试。运行网页无需 npm install。

## 圈层地图与下一期预测的本地数据

完整社区数据不提交 Git。已有旧项目 `dist/data.json` 时运行：

```bash
python3 scripts/prepare-reddit-map.py --source /path/to/old-project/dist/data.json
```

脚本只导出匿名用户标识、社区、窗口和归属记录到被忽略的 `dist/reddit-network.json`，并记录源文件 SHA-256。也可在地图缺少数据时直接通过页面载入旧 `data.json` 或该导出文件。网页不会下载原始归档或重新训练模型。

有旧项目完整预测文件时，再运行：

```bash
python3 scripts/prepare-reddit-predictions.py --network-source /path/to/old-project/dist/data.json --predictions /path/to/old-project/dist/predictions.json
```

该脚本将已有预测与原始用户、社区顺序及文件哈希绑定，生成被 Git 忽略的 `dist/reddit-predictions.json`。页面校验对应的数据哈希、历史排除和真实下一期记录；缺少预测文件时可手动载入该导出。需要配套的 `reddit-network.json`。完整预测包含 P07→P08 验证期及 P08→P09、P09→P10、P10→P11 测试期，四种方法为 HGNN+、MLP、社区重叠及热门基线。

当前本机完整导出与保留的三个案例属于不同批次，因此各自使用配套指标，不覆盖旧结果。筛选命中或未命中属于事后探索，不改变完整测试集评估。这一页回放训练好的预测；另一个“自建数据预测”标签实时调用保存的权重。

## 自建数据预测

用更新后的 `python3 launch.py` 启动，然后打开 `index.html#reddit-custom`。若已经开着旧版静态服务，需要重启。页面提供可编辑示例、模板下载、JSON 文件导入、逐字段说明和 44 个支持社区的列表。

输入由 `schema_version: 1`、`period_days: 28`、`users` 三部分组成。每位用户包含唯一 `id` 与按时间排列的 `history`；每一期包含社区名称数组 `communities` 和非负整数 `reply_degree`。所有用户期数一致，无活动期填写空数组和 0。支持 1–100 位用户、1–11 期、最多 256 KiB；社区名称大小写须与权重的固定字典一致。回复度数是该用户每期在各社区中不同回复对象数量之和，排除自己，不是评论条数，不能省略或自动补值。

点击“检查格式与预览”后再“调用模型”，服务器会从本机权重计算两种方法的 Top 5，排除历史社区，结果可按用户切换和下载。HGNN+ 仅在这次提交的用户之间建立社区–窗口超边，不混入原来的 8,000 位用户；MLP 只看个人特征。小规模自建数据的效果未经测试集验证，分数不是概率。没有真实下一期标签，所以不提供准确率或命中率。

接口只监听本机 `127.0.0.1`：`GET /api/reddit/model` 返回当前权重批次、社区列表和模板；`POST /api/reddit/predict` 接收上述 JSON。输入和输出不自动保存、不写入训练数据、不触发训练；可通过页面下载保存。模型不可用时显示实际错误，原来的圈层地图、已保存预测和案例仍可使用。

地图的社区人数和 Jaccard 使用完整选定样本；最多 48 个绘图节点是显示取样，不影响统计。数据文件不属于安装离线缓存的必需资源；通过本地服务成功载入后，才缓存相应数据或预测文件以供断开服务时使用。仅克隆代码也可打开其余页面和已有预测案例。

传播与划分算法在本地执行；RAG 页面展示预设证据和论文数据，不调用模型 API、不重跑论文训练。原始数据、环境配置、密钥、日志、生成报告和临时预览不纳入版本管理。

详细操作见 `先读我.txt`、`趣味版游玩说明.md` 和网页中的操作文档。旧说明提到的 `output/` 报告、`preview/` 截图为本地产物，不随 Git 克隆提供；报告生成需要另行准备截图及 Python 依赖。
