# Translation instructions (English → Simplified Chinese, LaTeX)

You are translating one chunk of a set of mathematics lecture notes (algebraic
geometry / Gromov–Witten theory / log geometry) from English into Simplified
Chinese. The source is a LaTeX file of the `amsart` class. Your task message
gives you an INPUT file and an OUTPUT file. Read this whole instructions file
first, then read ONLY your input file, and write ONLY your output file.

## Strict constraints

1. Your **only** permitted input is the chunk file named in your task. Do **not**
   read, list, `cat`, `ls`, `grep`, or otherwise open **any** other file or
   directory under `/Users/patrick/Documents/notes/misc/sichuan`. That directory
   contains other people's Chinese translations of the same notes; you must
   **never** consult them (nor the English `notes.tex`, nor anything under
   `tmp/`). Reading them invalidates your work. Work from the chunk alone. (This
   instructions file lives outside that directory and is the only other file you
   may read.)
2. Write exactly **one** file: the OUTPUT path named in your task. Do not create
   or modify any other file.
3. Translate **only human-readable English prose**: running text, statements of
   theorems/lemmas/propositions/definitions/examples/remarks/warnings, section
   and subsection titles, item labels in description lists, figure captions.
4. Reproduce **everything else byte-for-byte**:
   - all math: `$...$`, `\(...\)`, `\[...\]`, `align`, `equation`, `gather`,
     `tikz-cd`, etc.;
   - every LaTeX command and its arguments, macro names, optional arguments
     `[...]`; all `\label{...}` (labels contain English words — **never**
     translate them), `\ref`, `\Cref`, `\cref`, `\eqref`, `\cite`,
     `\footnote` arguments that are pure math;
   - all environment names and `\begin{...}...\end{...}` lines;
   - the full contents of `tikzpicture` (including node text — leave it as is);
   - `\includegraphics` lines, `\graphicspath`;
   - `%` comments: leave them exactly as they are (in English);
   - blank lines and paragraph breaks: keep the same number of paragraphs in the
     same order. Never merge, split, add, delete or reorder content.
5. `\section{...}` / `\subsection{...}` lines: translate only the text inside the
   braces (any math stays as-is), keep the trailing `%` on the line, and keep the
   `\label{...}` line that follows exactly unchanged. For
   `\texorpdfstring{A}{B}` translate both `A` and `B` (B: plain text, no math
   commands, ASCII-safe). Translate `\caption{...}` prose too.
6. Contents of `\text{...}`, `\mathrm{...}`, `\operatorname{...}`, `\mathtt{...}`,
   `\mathsf{...}`: leave unchanged.
7. Keep personal names in Latin letters exactly as written (Yaoxiong Wen, Bin
   Wang, Patrick Lei, Shuai Guo, Qile Chen, Yang Zhou, Xueqing Wen, Xiaohan Yan,
   You-Cheng Chou, Tingting Fang, Zijian Han, Givental, Witten, BCOV, ...). Do
   **NOT** convert any personal name to Chinese in this step. Keep software names
   (Macaulay2, Codex, Claude, pi) as-is.
8. Do not "improve", correct, or complete the mathematics. If a sentence is
   unclear or seems wrong, translate it as it stands.

## Style

- Fluent, natural Chinese as used in modern Chinese mathematical writing
  (think 代数几何/数学年刊 style). Use 我们 for "we"; avoid literal translation
  of English word order; prefer 设/记/称之为/满足/使得/故/于是 naturally.
- Chinese full-width punctuation for Chinese sentences: ，。：；、（）“”等.
  Leave a normal space between Chinese text and inline `\(...\)` math or Latin
  names where it reads better.
- Inline math stays in `\(...\)`. Do not translate symbols such as
  `1`-dimensional → `1` 维.
- Do not leave stray English words in the middle of a Chinese sentence unless
  they are technical terms deliberately kept in English (see glossary).
- Typical renderings: "Note that" → 注意到/请注意; "Conversely" → 反之;
  "In particular" → 特别地; "It follows that" → 于是/由此可得; "as desired" →
  即为所求; "without loss of generality" → 不失一般性; "if and only if" → 当且仅当;
  "We leave the details to the reader" → 细节留给读者; "is well defined" →
  良定义; "is independent of choices" → 与选取无关.

## Terminology glossary (use consistently)

geometry: scheme 概形, variety 簇, stack 叠 (algebraic stack 代数叠,
quotient stack 商叠, DM stack DM叠, Artin stack Artin叠), space 空间, moduli
space 模空间, moduli problem 模问题, parameterize 参数化, family 族, functor
函子, natural transformation 自然变换, sheaf 层, coherent sheaf 凝聚层, vector
bundle 向量丛, line bundle 线丛, divisor 除子, section 截面, morphism 态射,
orbit 轨道, quotient 商, geometric quotient 几何商, closed point 闭点, smooth
光滑, projective 射影, affine 仿射, proper 真（proper）, flat 平坦, ample 丰富,
polarization 极化, Hilbert scheme 希尔伯特概形, cone 锥, tangent space 切空间,
normal bundle 法丛, canonical bundle 典范丛, determinant 行列式线丛, Picard
group 皮卡群.

invariants/GIT: geometric invariant theory 几何不变量理论（GIT）, invariant
不变量, (semi)stable （半）稳定, stability condition 稳定性条件, character 特征标,
torus 环面, one-parameter subgroup 单参数子群, fixed locus 不动点轨迹, stratum
层（stratum）, stratification 分层, theta-stratification \(\Theta\)-分层,
frontier condition 前沿条件, attractor 吸引子, flow 流, non-abelian localization
非阿贝尔局部化, localization 局部化, equivariant 等变, wall 墙, chamber 室,
localization formula 局部化公式.

derived/obstruction: derived category 导出范畴, derived functor 导出函子,
perfect complex 完美复形, obstruction theory 障碍理论, perfect obstruction
theory 完美障碍理论, virtual fundamental class 虚基本类, virtual class 虚类,
virtual dimension 虚维数, obstruction bundle 障碍丛, deformation 形变, smoothing
光滑化, deformation theory 形变理论, versal 通用, miniversal 次通用, resolution
消解, exact sequence 正合列, Ext/Tor 保持为 Ext/Tor, Hom 保持为 Hom, adjoint 伴随.

log geometry: log geometry 对数几何, log structure 对数结构, log scheme 对数概形,
log smooth 对数光滑, monoid 幺半群, sharp 尖（sharp）, fs / fine and saturated
fs（fine and saturated）, chart 图表, characteristic morphism 特征态射, associated
graded 相伴分次, integral 对数积（integral）, tropicalization 热带化, skeleton
骨架, cone complex 锥复形, punctured 穿孔, prestable 预稳定, stable curve 稳定曲线,
nodal 结点, marked point 标记点, dual graph 对偶图, combinatorial type 组合型,
twist 扭, fundamental class 基本类, miniversal deformation 次通用形变.

GW theory: Gromov–Witten invariant 格罗莫夫–威滕不变量（GW 不变量）, stable map
稳定映射, moduli of stable maps 稳定映射模空间, evaluation map 求值映射, quantum
cohomology 量子上同调, product 积, Poincaré pairing 庞加莱配对, unit 单位, flat
coordinate 平坦坐标, primary 初级, descendant 后代, ancestor 先祖, tautological
(class) 重言（类）, CohFT 上同调场论, Frobenius manifold 弗罗贝尼乌斯流形,
semisimple 半单, quantum differential equation 量子微分方程, J-function
J-函数, I-function I-函数, central charge 中心荷, mirror symmetry 镜像对称,
oscillatory integral 振荡积分, stationary phase 稳定相, spectral curve 谱曲线,
free energy 自由能, tau function \(\tau\)-函数, string equation 弦方程, dilaton
equation 膨胀子方程, topological recursion 拓扑递归, graph sum 图和, Feynman rule
费曼规则, R-matrix R-矩阵, reconstruction theorem 重构定理, operator formalism
算符形式, geometric quantization 几何量子化, state space 态空间, genus 亏格,
moduli of curves 曲线模空间, boundary divisor 边界除子, gluing 粘合, forgetful
morphism 遗忘态射, psi class \(\psi\)-类, Witten's \(r\)-spin Witten 的
\(r\)-spin, Witten's conjecture Witten 猜想.

decomposition theorem: decomposition theorem 分解定理, semismall 半小, small 小,
perverse sheaf 反常层, intersection complex 相交复形, hard Lefschetz 硬莱夫谢茨,
weights 权重, mixed Hodge structure 混合霍奇结构, direct image 直接像, support
支撑, cohomology 上同调, homology 同调, Poincaré duality 庞加莱对偶.

K-theory: K-theory K理论, quantum K-theory 量子K理论, K-group K群, loop space
环路空间, adelic 阿代尔（adelic）, permutation-equivariant 置换等变, GV
correspondence GV 对应, BPS invariant BPS 不变量, multi-cover 多重覆盖, Euler
characteristic 欧拉示性数, Chern character 陈特征标, Todd class 托德类, virtual
structure sheaf 虚结构层, level structure 层级结构.

quasimap/GLSM: quasimap 拟映射（quasimap）, wall-crossing 越墙（wall-crossing）,
master space 主空间, \(\varepsilon\)-stability \(\varepsilon\)-稳定性, instability
locus 不稳定轨迹, GIT quotient GIT 商, gauged linear sigma model 规范线性
\(\sigma\) 模型（GLSM）, R-map R-映射, log GLSM 对数 GLSM, log R-map 对数
R-映射, punctured R-map 穿孔 R-映射, scattering diagram 散射图, finite
generation 有限生成, tropical decomposition 热带分解, fan 扇, Artin fan Artin 扇,
narrow 窄, wide 宽, sector 扇区, state space 态空间, continuation 连延拓
（continuation）.

quintic/B-model: quintic (threefold) 五次三维簇, quintic 五次（超曲面）, A-model
A 模型, B-model B 模型, holomorphic anomaly equation 全纯反常方程（HAE）, anomaly
反常, propagator 传播子, vertex 顶点, Feynman rule 费曼规则, free energy 自由能,
holomorphic 全纯, BPS number BPS 数, remodeling conjecture remodeling 猜想,
rationality 有理性, constant term 常数项, double-scaling limit 双尺度极限,
extended family 扩张族, boundary condition 边界条件, formal quintic 形式五次
（formal quintic）.

theorem names: Theorem 定理, Proposition 命题, Lemma 引理, Corollary 推论,
Definition 定义, Remark 注, Example(s) 例, Claim 断言, Conjecture 猜想,
Construction 构造, Notation(s) 记号, Addendum 补充, Exercise 习题, Warning 警告,
Scholium 评注, Proof 证明, Question 问题.

If a term is not listed, use the standard Chinese mathematical term; keep the
English in parentheses at first occurrence in a chunk if you are unsure.

## Final report

In your final message report: (a) the output of `env | grep PI_MODEL`, (b) the
number of lines of the file you wrote, (c) at most three sentences about
anything you were unsure of. Keep the report short.