# project2 内的 Reddit 训练与推理

本目录从旧项目的本地版本 `1d2c3a1ddb6aa074c3a53b3796bd10c6f7b61a7c` 迁入 HGNN+、MLP、数据处理和评估代码。所有运行路径均位于 project2，不依赖相邻的 `project/`。网页仍通过 `python3 launch.py` 启动。

## 克隆后直接调用模型

仓库包含 `models/reddit/project2-20261102-001/hgnnp.pt`、`mlp.pt` 和 `metadata.json`。安装下方 `.venv` 依赖后运行 `python3 launch.py`，在「自建数据预测」中调用即可，无需重新训练。模型包只包含参数、有序社区字典、公开训练参数和来源哈希，不包含原始用户记录或用户名映射。

`checkpoints.py` 统一检查模型来源和权重哈希：有 `reports/reddit/active-run.json` 时使用显式激活的本地批次；新克隆使用 `models/reddit/default.json`。已激活的本地批次损坏时会报错，不会悄悄换模型。自建推理根据模型包的有序字典构造输入，不依赖原训练集；原样本推理与重新训练仍需要本地数据。

## 数据范围

`44 个社区 × 8,000 位用户 × 11 期` 是实验子集，不是完整 Reddit。原始 SNAP 回复网络归档含 2,046 个文件；当前按固定主题列表选择 44 个社区，再仅按 P01–P06 的记录选出至少出现两期、社区参与较活跃的 8,000 位用户。每期 4 周。节点归属使用回复网络的发送者和接收者；模型还使用过去窗口中的回复出度特征。

原始归档、训练数据、身份映射、本地运行配置、完整训练记录和结果仍只保存在本地。当前批次的两份公开推理权重另放在 `models/reddit/`，随 Git 同步；其他训练产物继续忽略：

| 位置（相对 project2） | 用途 |
| --- | --- |
| `data/reddit/raw/reddit_reply_networks.tar.gz` | 原始归档，约 997 MiB |
| `data/reddit/raw/selected/` | 选定 44 个社区的原始回复网络 |
| `data/reddit/processed/network.npz` | `membership[11,8000,44]` 和 `degree[11,8000]` |
| `data/reddit/processed/viewer-data.json` | 有序匿名用户、社区、日期、归属和度数，与训练矩阵核对 |
| `data/reddit/processed/user_mapping.json` | 仅供本地追溯的原用户名映射，不给网页使用 |
| `training/reddit/config.local.json` | 实际训练配置；`config.example.json` 是可复制的参数示例 |
| `artifacts/reddit/legacy/` | 迁入的旧权重，保持不变 |
| `reports/reddit/legacy/` | 旧指标、预测、网页导出及迁移文件哈希清单 |
| `artifacts/reddit/runs/<run-id>/` | 每次新训练的 HGNN+ 和 MLP 权重 |
| `reports/reddit/runs/<run-id>/` | 配置、日志、指标、预测、校验结果和运行清单 |
| `reports/reddit/active-run.json` | 当前完整预测页使用的训练批次 |

## 环境与重新训练

在 project2 根目录执行。当前已创建独立 `.venv` 并复制安装好的依赖；新机器可安装锁定依赖：

```bash
python3.11 -m venv .venv
.venv/bin/python -m pip install -r training/reddit/requirements.lock
cp training/reddit/config.example.json training/reddit/config.local.json
```

当前本机数据已复制就位，可以直接训练；仅克隆仓库的新机器没有原始数据，重新训练需先准备数据。只有更改社区或样本选择参数时才需要重新处理原始归档：

```bash
.venv/bin/python training/reddit/prepare.py
```

重新处理会更新 `data/reddit/processed/`，旧训练批次会检查数据哈希并拒绝在不匹配的数据上推理。更换数据前应保存需要保留的旧数据快照。

每次训练使用新的 `run-id`；已有目录不会被覆盖：

```bash
.venv/bin/python training/reddit/train.py --run-id reddit-local-001
.venv/bin/python training/reddit/validate.py --run-id reddit-local-001 --raw
```

默认 CPU、4 线程、seed 42，两种模型各训练 70 轮，以验证集 NDCG@5 选权重。训练 P03→P04 至 P06→P07；验证 P07→P08；测试 P08→P09、P09→P10、P10→P11。测试时权重冻结，历史窗口向前滚动。仅对有历史且下一期确有新增社区的用户计算条件排序指标；不表示预测“是否会迁移”，也不包含冷启动推荐。

运行清单记录 commit SHA、未提交改动、源文件哈希、输入文件哈希、完整命令、实际配置、依赖版本和输出哈希。建议先提交训练代码，再运行，便于准确复现。

## 从权重推理与更新网页

将 `u_...` 替换为网页中的匿名 ID；`--cutoff 7` 表示截至 P08，参数从 0 开始：

```bash
.venv/bin/python training/reddit/infer.py --run-id reddit-local-001 --model hgnnp --cutoff 7 --user-id u_...
```

推理会从权重重新计算分数，不读取未来标签。该命令用于原训练数据中的用户，输入必须与权重的数据和社区顺序匹配。自建用户可使用下面的前端接口。

`python3 launch.py` 现包含本机模型 API。打开 `index.html#reddit-custom`，编辑或导入 JSON，按页面格式说明填入用户历史后调用模型。`custom_schema.py` 校验结构，`custom_predict.py` 在独立子进程加载本批次 HGNN+ / MLP 权重，按固定的 44 个社区构建新用户特征与本次提交群体的超图。新用户不需要来自原训练集，也不会与原 8,000 人混合；添加新社区类别则需要重新训练。

API 不保存用户输入，不修改旧数据或预测。每次返回训练批次、训练 commit、输入 SHA-256 和排序结果，前端可一并下载。请求上限 256 KiB、100 位用户、11 期历史，模型计算超时为 30 秒。输入编辑后旧结果会清除；计算期间输入发生变化时，前端丢弃过期响应。

校验通过后，可将新批次用于 07 的完整“下一期预测”页面：

```bash
.venv/bin/python training/reddit/activate.py --run-id reddit-local-001
```

该命令先重放权重并核对全部导出，再备份当前网页完整预测到 `reports/reddit/page-backups/`。原来的三个讲解案例 `dist/reddit-data.js` 不会被覆盖。

## 验证

```bash
.venv/bin/python -m unittest discover -s tests -p 'test_reddit_*.py' -v
npm test
```

Python 检查未来数据隔离、超图均值聚合、时间划分、历史候选排除、冷启动和训练反向传播，也检查自建输入校验、HTTP 错误处理及真实权重推理：改变同伴历史会影响 HGNN+，而目标用户的 MLP 不变。真实权重测试使用已发布模型包；另有检查验证不带原始数据和训练报告的干净目录也能推理，并拒绝损坏权重或不匹配的社区字典。运行级校验覆盖权重重放、真实新增标签、全部导出排名和整体指标；加 `--raw` 会核对全部 3,872,000 个原始成员关系及回复度数。
