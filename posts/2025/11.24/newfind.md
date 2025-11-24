# Knowledge Erasure：基于 Model Editing 的实现方案

## 1. 任务定义 (Task Definition)

**Knowledge Erasure** 的目标是移除或屏蔽模型中已有的特定知识（如隐私数据、偏见或有害信息），使其不再被回忆起。

- **形式化定义**：

  $$\theta^{\prime}=F(\theta,\{k\}\rightarrow\{\emptyset\})$$

  即：通过编辑函数 $F$，将原模型 $\theta$ 中的知识 $k$ 映射为空集，得到后编辑模型 $\theta^{\prime}$。

- **具体目标 (Sanitation Dataset)**：

  在 Sanitation 数据集中，目标是让模型对包含敏感信息的 Prompt（例如 "What is John Smith's address?"）回答预定义的 Safe Token Sequences（例如 "I don't know"），从而防止信息泄露。

---

## 2. 实现策略 (Implementation Strategies)

根据论文及 **EasyEdit** 框架，实现擦除主要有以下两种技术路径：

### A. 基于重定向的参数更新 (Retargeting via Parameter Update)

这是使用 **ROME** 或 **MEMIT** 等方法的常见思路，实质上是一种特殊的 **Knowledge Modification**。

- **原理**：
  不仅仅是物理上的“删除”权重，而是将特定的 Input（敏感问题）强行映射到一个新的 Target Output（即 "I don't know" 或空字符串）。

- **操作方式**：
  1. 将隐私问题作为 Subject/Prompt。
  2. 将 *"I don't know"* 或拒答语句设定为 **Edit Target**。
  3. 使用算法（如 **ROME**）计算更新量 $\Delta W$，并将其注入到 Transformer 的 **FFN** (Feed-Forward Network) 层中。

- **效果与缺陷**：
  - **ROME** 在阻止模型输出目标隐私知识方面可以达到约 **90%** 的准确率。
  - **严重缺陷**：这种方法会严重破坏模型的 **Locality**（局部性）。论文数据显示，**ROME** 在擦除任务中的 **Locality** 仅为 **55.61%**，这意味着它破坏了模型在其他不相关知识上的表现（即模型变“傻”了）。

### B. 基于神经元修剪/掩码 (Pruning or Masking Neurons)

这类方法更接近于物理层面的“擦除”，通过定位并禁用特定神经元来实现。

- **DEPN (Detecting and Editing Privacy Neurons)**：
  - **原理**：定位与隐私敏感信息相关的特定 **Neurons**。
  - **操作**：检测到这些 Privacy Neurons 后，通过将其激活值（Activations）设置为零（Zero-out）来进行编辑。
  - **优势**：实验表明，**DEPN** 可以在显著减少隐私数据泄露的同时，不牺牲模型的整体性能。

- **Concept Erasure (in AIGC)**：
  - 在文本生成图像（Text-to-Image）领域，也有类似方法（如 Erasing Concepts），通过修改权重从模型中永久擦除特定概念。

---

## 3. 在 Sanitation 数据集上的实际表现

在 **Sanitation** 数据集的测试中，目前的通用 **Knowledge Editing** 方法表现普遍面临挑战：

- **总体表现**：**ROME**、**MEND**、**MEMIT** 等方法都很难在彻底遗忘（**Edit Success**）和保持其他能力（**Locality**）之间取得平衡。
- **Locality 问题**：如前所述，强行重定向输出（如使用 **ROME**）会导致模型在非目标任务上的性能大幅下降。

---

## 4. 总结：执行流程 (Execution Workflow)

如果你使用 **EasyEdit** 或类似框架在 **Sanitation** 上实现擦除，建议流程如下：

1. **构造 Edit Request**：
   - **Prompt**: *"What is John Smith's address?"*
   - **Target**: *"I don't know."* (显式地教模型回答不知道)。

2. **选择方法 (Method Selection)**：
   - **优先考虑**：如果框架支持，优先尝试 **DEPN** 或类似基于神经元修剪的方法，以获得更好的 **Locality**。
   - **次选**：如果必须使用 **MEND** 或 **ROME**，需注意 **MEND** 通常在 **Locality** 上优于 **ROME**，但在擦除成功率上可能较弱。

3. **评估 (Evaluation)**：
   - **Edit Success**：检查模型是否输出了 *"I don't know"*。
   - **Locality (Retain Set)**：检查模型是否还能正确回答 **Retain Set** 中的其他非隐私问题，这是目前擦除任务最大的痛点。