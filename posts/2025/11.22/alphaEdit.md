------



### 1. 背景与核心直觉 (Background & Core Intuition)



现有的模型编辑方法（如 ROME, MEMIT）通常采用 **Locate-then-Edit** 范式 2222。它们在优化时面临一个核心矛盾：



- **Knowledge Update ($e_1$)**: 让模型学会新知识。
- **Knowledge Preservation ($e_0$)**: 让模型不忘记旧知识。

传统方法试图通过加权求和来平衡这两个目标：$\min (e_0 + \lambda e_1)$ 3333。

但在 Sequential Editing（连续编辑）场景下，这种平衡很难维持，导致模型逐渐过拟合新知识，破坏了原有分布，最终引发 Model Collapse（模型崩溃）或 Catastrophic Forgetting（灾难性遗忘） 4444。

AlphaEdit 的核心洞见：

与其在 Loss 函数里痛苦地平衡 $e_0$ 和 $e_1$，不如从几何角度彻底解决 $e_0$。

如果我们能找到一个空间，在这个空间里修改权重数学上保证完全不影响旧知识，那么我们就可以从 Loss 函数中移除 $e_0$，只专注于优化 $e_1$ 5。

这个空间就是旧知识矩阵 $K_0$ 的 **Null Space**（零空间）。

------



### 2. 关键定义与投影 (Definitions & Projection)





#### **输入定义**



- **Preserved Knowledge Keys ($K_0$)**: 代表模型原有知识的 Key 向量矩阵。
- **Update Target ($K_1, V_1$)**: 我们想要注入的新知识。
- **Perturbation ($\Delta$)**: 我们要加到模型权重 $W$ 上的增量。



#### **Null Space 的数学性质**



如果我们将 $\Delta$ 投影到 $K_0$ 的 Null Space 中，记为 $\Delta P$，那么根据定义，它必须满足：



$$(\Delta P) K_0 = 0$$

这意味着：



$$(W + \Delta P) K_0 = W K_0 + (\Delta P) K_0 = W K_0 = V_0$$



**物理意义**：无论 $\Delta P$ 如何变化，只要它在 Null Space 内，模型对旧知识 $K_0$ 的输出 $V_0$ **绝对不会改变** 6666。





#### **构造投影矩阵 $P$ (Projection Matrix Construction)**



由于 $K_0$ 维度极大（通常取 100,000 个样本），直接计算其 Null Space 不现实 7。AlphaEdit 利用了协方差矩阵 $C = K_0 K_0^T$ 来近似。



1. 对 $K_0 K_0^T$ 进行 SVD (奇异值分解) ：

   

   $$K_0 K_0^T = U \Lambda U^T$$

2. 提取对应零特征值（或极小特征值）的特征向量 $\hat{U}$ 。

   

   

3. 构造投影矩阵 $P$ ：

   

   $$P = \hat{U} \hat{U}^T$$

------



### 3. 算法推导：AlphaEdit 的闭式解 (Derivation of Closed-form Solution)



有了投影矩阵 $P$ 保护旧知识，我们现在的优化目标变得非常纯粹：只最小化新知识的误差，加上正则化项。



#### **步骤 1: 新的优化目标 (New Objective)**



我们不再需要 $e_0$ 项。新的 Loss 函数 $J$ 为 11111111：



$$J = \underbrace{||(W + \tilde{\Delta}P)K_1 - V_1||^2}_{\text{Update Error}} + \underbrace{||\tilde{\Delta}P||^2}_{\text{Regularization}} + \underbrace{||\tilde{\Delta}P K_p||^2}_{\text{Previous Edits Protection}}$$

- 这里 $K_p$ 指的是在这次编辑之前已经编辑过的知识（Sequential Editing Context）。
- $\tilde{\Delta}P$ 是经过投影后的实际更新量。



#### **步骤 2: 求解极值 (Solving for Minimum)**



为了找到最优的 $\tilde{\Delta}$，我们对 $J$ 求导并令其为 0。定义 Residual $R = V_1 - W K_1$。

根据文中公式 (13)，导数展开为 ：

$$(\Delta P K_1 - R) K_1^T P^T + \Delta P P^T + \Delta P K_p K_p^T P^T = 0$$

利用投影矩阵的性质 $P = P^T$ 和 $P^2 = P$ 13，我们可以提炼出 $\Delta_{AlphaEdit}$ 的闭式解。





#### **步骤 3: 最终更新公式 (Final Formula)**



最终得到的权重更新量 $\Delta_{AlphaEdit}$ 为 ：



$$\Delta_{AlphaEdit} = R K_1^T P (K_p K_p^T P + K_1 K_1^T P + I)^{-1}$$

**公式解析**：

- **$P$ (Projection)**: 这是 AlphaEdit 与 MEMIT 最大的区别。$P$ 强制更新向量正交于旧知识空间。

- 

  **$I$ (Identity Matrix)**: 这里起到了类似于 Ridge Regression 中 $\lambda I$ 的作用，保证数值稳定性 。

  

  

- 对比 MEMIT:

  MEMIT 的公式是 $\Delta = R K_1^T (C + K_1 K_1^T)^{-1}$。

  AlphaEdit 将协方差矩阵 $C$ 的约束作用，替换为了更强硬的几何约束 $P$，使得 $C$ 从分母中移除（隐含在 $P$ 的构造中）。

------



### 4. 算法流程总结 (Algorithm Summary)



1. **Pre-computation (Offline)**:

   - 计算通用语料的协方差矩阵 $C = K_0 K_0^T$。

   - 通过 SVD 计算 Null Space 投影矩阵 $P$。这一步只需要做一次 。

     

     

2. **Editing Phase (Online)**:

   - 接收编辑请求 $(s, r, o^*)$。
   - 计算 Current Key $K_1$ 和 Residual $R$。
   - 代入上述闭式解公式，计算 $\Delta_{AlphaEdit}$。
   - 更新权重 $W \leftarrow W + \Delta_{AlphaEdit}$。



### 5. AlphaEdit vs. MEMIT



| **特性**               | **MEMIT / ROME**                          | **AlphaEdit**                              |
| ---------------------- | ----------------------------------------- | ------------------------------------------ |
| **保护机制**           | Soft Constraint (通过 Loss 中的 $e_0$ 项) | **Hard Constraint** (通过 Null Space 投影) |
| **旧知识影响**         | 最小化干扰，但仍有非零影响                | **零干扰** (理论上保证为 0)                |
| **Sequential Editing** | 容易累积误差，导致 Model Collapse         | 极其稳定，支持数千次编辑而不崩溃           |
| **实现难度**           | 复杂                                      | 仅需在原有代码基础上**增加一行投影代码**   |



### 总结



AlphaEdit 本质上是在 MEMIT 的基础上做了一个关键的线性代数变换：**在修改参数前，先由投影矩阵 $P$ "过滤"掉所有可能伤害旧知识的方向**。这使得它在连续编辑任务中表现出了极强的稳定性（Average Improvement 36.7%）。