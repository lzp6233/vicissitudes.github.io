------



# MEMIT Algorithm: Closed-form Solution & Optimization

## 1. 数学推导 (Mathematical Derivation)



**目标 (Objective)**

我们的目标是寻找一个权重增量 $\Delta$，使得模型在掌握新知识 $(K, R)$ 的同时，对旧知识输入 $X_{old}$ 的输出影响最小（保持为 0）。我们将此定义为一个带约束的 **Ridge Regression**（岭回归）问题：

$$\min_{\Delta} \sum ||\Delta k_{new} - r_{new}||^2 + \sum ||\Delta x_{old} - 0||^2$$

**矩阵形式 (Matrix Formulation)**

我们将新旧数据拼接，构造“总输入矩阵” $\mathbf{X}$ 和“总目标矩阵” $\mathbf{Y}$：

- **Input Matrix**: $\mathbf{X} = [K \mid X_{old}]$ （新 Key 与旧 Input 拼接）
- **Target Matrix**: $\mathbf{Y} = [R \mid 0]$ （新 Residual 与 0 拼接）

此时，优化目标转化为求解线性方程组 $\Delta \mathbf{X} \approx \mathbf{Y}$。

**求解 (Solving via Normal Equation)**

根据最小二乘法的 **Normal Equation**（正规方程），其闭式解为：

$$\Delta = \mathbf{Y}\mathbf{X}^T (\mathbf{X}\mathbf{X}^T)^{-1}$$

**展开与代入 (Expansion & Substitution)**

我们需要分别展开分子和分母项：

1. 分子 (Numerator)：

   由于旧知识的目标变化量为 0，与 $X_{old}$ 相关的项在乘法中消失：

   $$\mathbf{Y}\mathbf{X}^T = [R \mid 0] \begin{bmatrix} K^T \\ X_{old}^T \end{bmatrix} = R K^T + 0 = R K^T$$

2. **分母 (Denominator)**：

   $$\mathbf{X}\mathbf{X}^T = [K \mid X_{old}] \begin{bmatrix} K^T \\ X_{old}^T \end{bmatrix} = K K^T + X_{old}X_{old}^T$$

3. 引入协方差 (Covariance)：

   我们将预先计算好的旧数据统计量定义为 $C \approx X_{old}X_{old}^T$。

**最终公式 (Final Formula)**

将上述展开结果代回原解中，得到最终的更新公式：

$$\Delta = R K^T (C + K K^T)^{-1}$$

------



## 2. 物理意义 (Physical Interpretation)



该公式在数学上完美平衡了 **Plasticity**（新知识的学习）和 **Stability**（旧知识的保持）：

- $R K^T$ (Correlation)：

  这一项建立了新输入 $K$ 与期望输出 $R$ 之间的关联方向。

- $(C + K K^T)^{-1}$ (Precision Matrix)：

  这一项充当正则化（Regularization）的角色。

  - $C$ 代表了模型“过去的记忆分布”。
  - 如果某个方向上 $C$ 的值很大（说明模型旧知识对该方向非常敏感），求逆后该项会变小，从而**抑制**$\Delta$ 在该方向上的变化，防止 **Catastrophic Forgetting**（灾难性遗忘）。

------



## 3. 工程优化 (Optimization Details)

### A. Woodbury 矩阵恒等式 (Woodbury Matrix Identity)

**问题**：直接计算 $(C + K K^T)^{-1}$ 需要对 $d \times d$ 维度的矩阵求逆（$d$ 通常很大，如 4096+），计算成本极高 ($O(d^3)$)。

**优化**：利用 **Woodbury Matrix Identity**，我们可以通过预先计算好的 $C^{-1}$ 来加速计算。特别是当编辑样本数 $N$ 远小于模型维度 $d$ 时 ($N \ll d$)：

$$(C + K K^T)^{-1} = C^{-1} - C^{-1} K (I + K^T C^{-1} K)^{-1} K^T C^{-1}$$

优势：

这不仅利用了预计算的 $C^{-1}$，还将实时求逆的矩阵维度从 $d \times d$ 降低到了 $N \times N$（$N$ 为 Batch Size）。

### B. 协方差矩阵 $C$ (Covariance Statistics)

- **定义**：$C = \mathbb{E}[x x^T]$
- **获取**：在未编辑的模型上，使用大量通用语料（如 Wikipedia）进行 Forward Pass，收集每一层 MLP 输入 $x$ 的外积平均值。

### 4. Python 代码实现 (Implementation Snippet)

Python

```
def get_context_templates(model, tok, length_params):
    # 伪代码：获取 Covariance C (通常是预计算好的)
    pass

def update_weights(C_inv, K, R):
    """
    利用 Woodbury Identity 高效计算更新量 Delta
    C_inv: 预计算的协方差矩阵逆 (d, d)
    K: 新知识的 Key 矩阵 (d, N)
    R: 新知识的 Residual 矩阵 (d_out, N)
    """
    
    # 1. 计算 Woodbury 中间项: (I + K^T C^{-1} K)^-1
    # 维度: (N, N) - 计算速度非常快
    woodbury_inner = torch.inverse(
        torch.eye(K.shape[1]) + K.T @ C_inv @ K
    )
    
    # 2. 应用 Woodbury 公式计算 (C + KK^T)^-1
    # 为了数值稳定性，通常不会显式展开大矩阵，而是分步相乘
    # 这里展示逻辑形式:
    term_to_subtract = C_inv @ K @ woodbury_inner @ K.T @ C_inv
    inv_term = C_inv - term_to_subtract
    
    # 3. 计算 Delta
    Delta = R @ K.T @ inv_term
    
    return Delta
```

