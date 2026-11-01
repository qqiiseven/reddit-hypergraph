# Reddit-hypergraph📕

一个真实 Reddit 数据驱动的交互式超图探索项目：**哪些社区通过同一批人相连，这些人下一期又会出现在哪里？**

网页没有外部 API、CDN 或在线推理依赖。数据原本是有向回复图；本项目从中派生“社区 × 时期”的共同参与超边，没有把回复图冒充原生超图。原始大数据包、训练权重和本地环境与网页展示所需的资源分开管理。

## 主要功能

- **圈层地图**：查看社区超图和共享用户，支持拖动、缩放及重叠矩阵。
- **参与轨迹**：查看用户在不同时间段出现于哪些社区。
- **跨圈连接者**：找出连接多个社区的用户。
- **下一期预测**：比较 HGNN+、MLP 和两种基线，揭晓真实下一期记录。

当前使用 44 个社区、8,000 名用户、11 个四周观察窗口的数据。

## 快速开始

推荐使用 **Python 3.11**，无需 GPU。首次初始化会自动安装依赖、下载约 **996 MiB** 原始数据并在本地处理和训练，请预留至少 **4 GB** 磁盘空间。

```bash
git clone https://github.com/qqiiseven/hypergraph_vis.git
cd hypergraph_vis
python3 setup_demo.py
python3 serve.py
```

打开 **http://127.0.0.1:8765/** 即可使用。Windows 可将 `python3` 替换为 `py -3.11`。

以后只需运行 `python3 serve.py`，无需重复初始化。端口被占用时使用 `python3 serve.py --port 8766`。

## 数据与开发

- 数据来源：[Stanford SNAP Reddit Networks](https://snap.stanford.edu/data/web-RedditNetworks.html)。原始数据、生成结果和模型权重均不提交 Git，在本机生成后可离线使用。
- 修改数据处理、训练代码或配置后，运行 `python3 setup_demo.py --rebuild`。
- 修改超图绘图库适配代码后，运行 `npm ci` 和 `npm run build`；前端测试使用 `npm test`。
- 超图绘图使用 [Hypergraph Plotter](https://github.com/phileasdg/hypergraph-plotter)，来源与许可证见 [THIRD_PARTY.md](THIRD_PARTY.md)。

“新社区”指此前观察窗口内未出现过的社区，不代表用户真实首次加入。当前支持查看与分析，尚不支持修改网络成员结构。
