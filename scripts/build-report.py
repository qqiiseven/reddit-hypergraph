"""Generate the editable-source report draft. Requires reportlab; not needed by the website."""
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
from reportlab.lib.utils import ImageReader

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output'/'pdf'/'report.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
font_candidates=[Path(os.environ.get('HYPERGRAPH_REPORT_FONT','__unset__')),Path('C:/Windows/Fonts/msyh.ttc'),Path('C:/Windows/Fonts/simsun.ttc')]
font_path=next((p for p in font_candidates if p.is_file()),None)
if font_path is None:
    raise RuntimeError('Set HYPERGRAPH_REPORT_FONT to a Chinese TrueType font path. The font is embedded in the PDF.')
pdfmetrics.registerFont(TTFont('STSong-Light',str(font_path),subfontIndex=0))
styles=getSampleStyleSheet()
for key in ['Normal','BodyText','Heading1','Heading2','Heading3','Title']:
    styles[key].fontName='STSong-Light'
styles['BodyText'].fontSize=10.5; styles['BodyText'].leading=17
styles['BodyText'].spaceAfter=10; styles['BodyText'].wordWrap='CJK'
styles['Heading1'].fontSize=21;styles['Heading1'].leading=29;styles['Heading1'].textColor=colors.HexColor('#204660');styles['Heading1'].spaceAfter=15
styles['Heading2'].fontSize=13;styles['Heading2'].leading=20;styles['Heading2'].spaceBefore=12;styles['Heading2'].spaceAfter=7
styles.add(ParagraphStyle('Caption',fontName='STSong-Light',fontSize=8.5,leading=13,textColor=colors.HexColor('#60788f'),spaceAfter=12))
styles.add(ParagraphStyle('SmallCN',parent=styles['BodyText'],fontSize=9,leading=14,spaceAfter=7))
story=[]
def p(text,style='BodyText'):story.append(Paragraph(escape(text),styles[style]))
def h(text):p(text,'Heading2')
def page(title):
    if story:story.append(PageBreak())
    p(title,'Heading1')
def image(file,caption,maxheight=300):
    src=ROOT/'preview'/file
    w,h=ImageReader(str(src)).getSize(); scale=min(480/w,maxheight/h)
    story.append(Image(str(src),width=w*scale,height=h*scale));story.append(Spacer(1,7));p(caption,'Caption')
def table(rows,widths):
    values=[[Paragraph(escape(str(v)),styles['SmallCN']) for v in row] for row in rows]
    t=Table(values,colWidths=widths,hAlign='LEFT',repeatRows=1)
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor('#e7f1f6')),('VALIGN',(0,0),(-1,-1),'TOP'),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#d5e1eb')),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8)]))
    story.append(t)

page('超图实验室：从两两关系到共同事件')
p('数据可视化期中项目报告初稿 | 2026-11-02','Caption')
p('小组编号、成员姓名及个人贡献：待小组填写。本文是基于当前源码和实际页面整理的报告初稿，提交前须由全组审核，并补充指定综述阅读总结和最终幻灯片。')
h('1. 项目简介与问题')
p('本项目面向首次接触超图的读者，通过交互式网页解释节点、超边、关联矩阵、有向关系及高阶作用。核心问题是：当数据记录的是“一组对象共同参与的事件”时，单纯保留两两连接会丢失哪些信息？')
p('项目依次组织认识超图、超图作用、应用探索、研究前沿、派对侦探和森林露营。用户先建立概念，再以传播与知识检索观察用途，最后用自定义结构检验自己的理解。项目不预设超图在所有任务中更优；带事件节点和属性的普通图同样可表达多元事实。')
image('01-composition-current.png','图 1. 当前认识超图页面的实际截图（首屏节选）；超图区域与关联矩阵联动。',285)
h('与课程要求的关系')
p('作业要求以超图为主题、包含鼠标或键盘交互，并提交项目说明、数据描述、截图、操作与视觉编码解释。本项目采用本地 HTML/CSS/JavaScript，不调用在线模型；报告后续分别说明这些内容。')

page('2. 数据、字段与计算口径')
table([['数据类别','字段、类型与来源','解释边界'],['教学结构','nodes 为节点名字符串数组；edges 为 {id, members[]} 数组。原始概念例与编辑实验均为人工构造。','没有现实抽样、隐私记录或模型训练含义。'],['传播模拟','节点二元状态、网络种子、时间步、两两/群体传播参数及恢复参数；浏览器本地计算。','随机网络共 2,000 人，显示 96 人局部视窗；不是现实传播观测。'],['传播论文图','paper-assets/figure3-data.json；图 3a 点坐标、图 3b 曲线路径及 CSV。','从论文原图数字化的约值，不是作者原始逐次实验数据。'],['RAG 评测','rag-benchmark.json：7 方法、5 领域、3 指标；rag-research-data.json：token、秒/次、美元/千次、消融及图中约值。','沿用来源文件注释；缺失项不补零，不把不同论文混合为同一次实验。'],['证据与前沿案例','预设实体、角色、事实和文本；车站案例注明论文来源，其余虚构教学材料逐页说明。','回放预设证据，不是现场执行检索或神经网络。']],[70,220,190])
p('划分算法实验另增加每条超边的整数 weight（1-9）、分区数 k、节点所属分区、随机起点种子和操作成本轨迹。数据为人工构造；成本由当前结构和目标实时计算，不能当作现实运行费用。')
h('结构定义与派生量')
p('无向超图 H=(V,E)，每条超边 e 是 V 的非空子集。本实验允许不同事件名称拥有相同成员，以保留事件身份。关联矩阵 H(v,e)=1 当且仅当节点 v 属于 e；否则为 0。节点度为所属超边数，超边大小为成员数。')
p('普通图投影规则：枚举每条超边内部所有无序节点对，再去重。大小为 k 的超边贡献 k(k-1)/2 对连接，但不同超边可能贡献相同普通边。编辑实验初始 6 节点、3 超边、9 次关联，去重后为 9 条普通边。')
h('反例与结论')
p('结构 A：{A,B}、{B,C}、{A,C} 三条超边，共 6 次关联；结构 B：{A,B,C} 一条超边，共 3 次关联。两者投影均为三角形。因此，仅凭去重的普通图投影，无法唯一还原原来的共同事件。该结论针对此投影定义，不意味着所有图表示都不能保留事件语义。')

page('3. 视觉编码与交互方法')
table([['视觉元素','编码与设计理由'],['节点圆形与标签','圆形定位对象，文字表达身份；较长实验节点名缩略显示，查询详情保留完整名。相同位置用于超图和普通图比较。'],['超边彩色区域','颜色区分超边，实验页矩阵列名沿用相同颜色；选中后加深描边。包围面积由布局决定，不编码权重、概率或规模。遮罩排除非成员节点。'],['普通图连线','一条线表示至少一条超边贡献该节点对，重复普通边合并；高亮与当前超边联动。'],['关联矩阵','行代表节点，列代表超边，1/0 直接表达成员资格；成员状态还使用底色、文本和列表，避免只依赖颜色。'],['曲线、条形与坐标','传播曲线表达时间与参与比例；评测条形使用零起点及数值标签，token、秒、美元和 F1 各自标单位及尺度。'],['状态与详情','选中图形联动矩阵和说明；数据来源、教学示例和论文结果分开标注，降低将模拟误读为实测的风险。']],[100,380])
h('交互技术')
p('采用选择与联动、直接编辑、参数调整、同步回放、按需展开、查询与导出。编辑实验将 JSON 结构作为共享模型，每次合法变更后重算投影和关联矩阵；输入先校验，失败保留当前数据。30 步撤销、反例预设和重置帮助用户试错。')
p('基础页面支持节点拖动与阻尼布局响应、超边选择、矩阵编辑以及有向关系反转；传播页支持状态和参数对照；RAG 页并排观察证据、角色与原文。导出使结构和图形可用于组员讨论及报告。')
h('易用性与规模限制')
p('按钮、输入与 SVG 可选择元素支持键盘操作；页面有可见焦点和状态提示；角色、合照、任务卡提供多种非颜色提示。新增页面在窄屏中堆叠视图，矩阵局部滚动。编辑实验限制 16 节点、12 超边以保持阅读清晰，不把教学布局宣传为大型超图可视化算法。')

page('4. 动物派对侦探：从猜测到证据')
p('05 使用森林动物、关系雷达和活动合照组织探索。用户选择三名伙伴，猜他们是否参加过同一场活动，再翻开相册核对完整事件。猜测、相册、成员选择和解释联动；原创矢量角色、发现印章与轻量纸屑反馈使概念更容易观察。')
p('世界 A 的活动为 ABD、BCE、ACF；ABC 三对都有普通边，却没有 ABC 同场的超边。世界 B 新增 ABC 活动，普通图去重投影仍是相同的 9 条边，超边却从 3 条变为 4 条。相同投影不能唯一还原共同事件，是本实验展示的表示优势；并不排除带事件节点或属性的图编码。')
image('05-party-full.png','图 2. 派对侦探实际截图：动物选组、两两雷达、活动合照和证据反馈；每张合照对应一条超边。',400)
p('原编辑实验保存在下方可展开的结构工作台，增删改查、矩阵、JSON/CSV/SVG 导出及撤销继续可用。“用这个世界替换下方工作台”需用户点击，且可撤销，不会在打开游戏时覆盖原编辑结构。')

page('5. 应用探索与结果阅读')
p('群体传播：在固定个人传播通道之外，三人共同参与可触发额外群体通道。两位邻居各以 10% 独立影响时，激活概率为 1-0.9²=19%；额外 30% 群体通道生效后为 1-0.9²×0.7=43.3%。这是教学参数，完整模型还包含恢复。')
image('03-propagation-offline.png','图 3. 群体传播页面实际截图。关闭本地服务后仍可加载；计算 Worker 完成准备后，已验证“前进 20 步”操作。',220)
p('RAG：三种预设证据结构并排呈现，角色、年份和原文帮助判断证据是否完整。评测视图展示答案质量与资源代价，而不是预设超图必然更省 token 或费用。不同论文及坐标约值分别标注。')
image('03-rag-offline.png','图 4. 超图 RAG 页面实际截图。停服后本地 JSON 仍能加载，并能切换领域与查看实际数值。',220)

page('6. 森林露营：让完整小队住在一起')
p('06 将节点化为动物、分区化为小屋，仍实际计算平衡超图划分。全体任务成员同屋时，任务卡变绿、小屋窗户亮起；跨屋任务继续计成本。入门数据有 6 名动物、3 项任务，成本从 7 可降到全局最低 1；两张任务卡就绪，剩余交换果酱任务跨屋，不能误读为所有任务都能同时就绪。')
p('局部搜索枚举所有跨组节点对，每步接受下降最大的交换。预设陷阱在固定起点下从 11 降到 8 后停止，而小规模穷举确认全局最低为 6。另一个预设中，即使在普通图最优解里选择超图成本最低的一解，其超图成本仍为 20，而直接优化超图目标可达到 19。以上数字是本地合成数据的实际程序结果，不是论文报告值。')
image('06-camp-board.png','图 5. 森林露营工作台实际截图：动物住客、任务全员、同屋亮灯及成本反馈；求解逻辑与公式保留。',280)
h('目标定义与对照口径')
p('连接成本为 Σ w(e)(λ(e)-1)，cut-net 为 Σ w(e)1[λ(e)>1]。普通图对照按每条超边内部的所有跨组节点对累加权重，保留重复贡献；结果统一用所选超图目标评价，避免将量纲不同的原始成本直接相减。')
p('穷举仅用于 4-12 节点、2 或 3 个等容量分区的小规模教学结构；固定首节点分区去除部分标签对称，不改变最低成本。局部搜索和穷举程序是本项目实现，没有把它们宣称为 Mt-KaHyPar 的算法复现。原操作文档移到辅助入口，不再占据 06 主栏目。')

page('7. 离线部署、验证与局限')
h('运行方式与实现')
p('运行环境为现代浏览器与 Python 3；网页不需要 pip、npm install、登录、API Key 或互联网。Windows 双击 START-WINDOWS.bat，其他系统使用对应脚本。启动器仅监听 127.0.0.1，默认 4173，冲突时尝试 4174-4183。直接双击 HTML 不能替代 HTTP 服务，因为 JSON 加载与 Worker 受浏览器本地文件限制。')
p('离线有两层：第一层为本机 HTTP 服务提供全部资源，首次打开也无需互联网；第二层为 Service Worker 缓存。版本化缓存包含 HTML、CSS、JS、字体、图片、JSON 和传播 Worker，共 56 项。请求优先访问本机服务，失败回退缓存；外部论文链接不拦截。重新生成资源清单可更新缓存版本。')
h('实际验证与可复现命令')
p('自动测试：npm test，共 32 项通过，覆盖原有模型/传播行为、投影反例、导入校验、删除级联、成员修改、重复事件、划分目标、局部搜索、独立穷举核对、公平普通图对照、缓存资产完整性及断网回退。node --check 验证新增脚本语法。')
p('浏览器验证：反例切换、添加节点和超边、成员编辑、查询、撤销、无效导入保护、资源检查与缓存检查；页面显示完整缓存 56/56。实际停止本地服务后，首页刷新、跨页导航、传播 Worker 与 RAG JSON 仍可工作。验证记录另附，截图来自本次实际页面。')
h('局限')
p('未进行用户研究或学习效果评估；未训练、重新运行或复现论文模型。已有论文数值未在本次逐单元重新提取。研究前沿是有出处的简介与教学交互，不能充当原算法复现。缓存可能被清除且不同浏览器/端口不共享；课堂演示仍建议保持本地服务。新增 06 已检查 375 与 1440 像素宽度下的布局和横向溢出；完整交互验收以桌面浏览器为主。')
h('参考与归属')
for text in ['指定阅读入口：https://ieeexplore.ieee.org/abstract/document/9264674（本次未取得完整正文，阅读总结待小组补充）。','Iacopini et al., Simplicial models of social contagion, Nature Communications 10, 2485, 2019. https://doi.org/10.1038/s41467-019-10431-6','HyperGraphRAG, NeurIPS 2025. https://github.com/LHRLAB/HyperGraphRAG；数值定位见本地 JSON source 字段及网页图注。','HyperRAG, 2026. https://arxiv.org/abs/2602.14470；与 HyperGraphRAG 是不同研究。','Mt-KaHyPar 目标定义：https://github.com/kahypar/mt-kahypar#supported-objective-functions；本项目没有复现其求解器。','原图保留 CC BY 4.0 作者归属；本地字体许可证见 dist/fonts。其他前沿论文和可视化参考见网页研究说明。']:
    p(text,'SmallCN')

page('8. 作业对照、披露与小组待办')
table([['作业条款','项目材料与状态'],['1.1 指定综述','入口保留；需小组完成精读并补写理解，不冒充已经完成。'],['1.2 主题与交互','01-06 提供超图结构、传播与证据探索；编辑实验支持自定义数据，算法挑战呈现实际求解过程、局部最优和精确核对。'],['1.3 报告','本稿含简介、字段与数据边界、截图、操作及视觉编码；须经全组审核并补齐真实成员信息。'],['1.4 外部资源','本稿说明本次 Codex 使用；需补全此前大模型、代码、设计或其他外部资源使用情况。'],['课堂汇报','2026-11-04；每名成员讲述个人贡献，至多 3 分钟；整组问答 3 分钟；需要全体成员幻灯片。'],['提交格式','2026-11-03；Group-[组号].zip；根目录 report.pdf；Visualization Appendix 存所有代码与成员幻灯片；不超过 50 MB。']],[105,375])
h('AI 与外部资源使用披露')
p('2026-11-02 使用 OpenAI Codex 辅助读取作业 PDF、审查源码、编写编辑实验、动物派对与森林露营交互、划分算法挑战及离线缓存、执行测试、整理截图和生成本报告初稿。本项目确实使用了 AI 辅助，因此不应声明“完全没有借助外部帮助”。组员须理解代码、核对引用并承担最终报告责任；此前的使用情况由本人据实补充。')
h('个人贡献登记（须如实填写）')
p('小组编号：________；成员与学号：________；每人的设计、实现、数据整理、测试、报告或汇报贡献：________。这些信息不能从源码准确推断，本稿不代填。')
h('建议排练与提交步骤')
p('先用投影反例解释动机，再现场修改一次成员关系，然后展示传播或 RAG 的用途，最后说明数据来源和模型边界。此路线是项目建议，不是额外的作业硬性要求。')
p('完成综述阅读、成员贡献与幻灯片后，将审核后的 PDF 和包含所有成员幻灯片的文件夹交给 scripts/pack-submission.py。脚本自动整理规定目录并检查 50 MB 上限；缺真实材料时不把草稿包冒充最终提交。')
p('评分权重：完整性 40%、清晰度 30%、创造性 30%。新增实验以可验证的反例和共享数据联动补充交互深度；配套说明与离线支持增强可解释性和现场演示稳定性。')

def page_footer(canvas,doc):
    canvas.saveState();canvas.setStrokeColor(colors.HexColor('#cfdee8'));canvas.line(48,42,547,42);canvas.setFont('STSong-Light',8);canvas.setFillColor(colors.HexColor('#688096'));canvas.drawString(48,27,'超图实验室 | 报告初稿 · 待小组审核');canvas.drawRightString(547,27,str(doc.page));canvas.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=(595.28,841.89),rightMargin=52,leftMargin=52,topMargin=42,bottomMargin=58,title='超图实验室 - 期中项目报告初稿',author='项目小组（待填写）')
doc.build(story,onFirstPage=page_footer,onLaterPages=page_footer)
print(OUT)
