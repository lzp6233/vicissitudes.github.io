# 数学公式测试

> 测试 KaTeX 数学公式渲染

- 日期：2025-11-16
- 标签：测试, 数学公式

## 行内公式测试

这是一个行内公式：$E = mc^2$，爱因斯坦的质能方程。

根据公式 $\Delta = \Delta_{delay} + \Delta_{proc} + \Delta_{drift}$，我们可以计算总延迟。

集合符号：$x \in \{1, 2, 3\}$，并集 $A \cup B$，交集 $A \cap B$。

希腊字母：$\alpha, \beta, \gamma, \Delta, \Omega, \pi, \sigma$

## 块级公式测试

求和公式：

$$
\sum_{i=1}^{n} x_i = \frac{n(n+1)}{2}
$$

积分公式：

$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$

矩阵：

$$
\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}
$$

分段函数：

$$
f(x) = \begin{cases}
x^2 & \text{if } x \geq 0 \\
-x^2 & \text{if } x < 0
\end{cases}
$$

## 复杂公式

贝叶斯定理：

$$
P(A|B) = \frac{P(B|A) \cdot P(A)}{P(B)}
$$

二次方程求根公式：

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

泰勒级数：

$$
f(x) = f(a) + f'(a)(x-a) + \frac{f''(a)}{2!}(x-a)^2 + \cdots
$$

## 逻辑符号

- 存在：$\exists x \in \mathbb{R}$
- 任意：$\forall x \in \mathbb{N}$
- 属于：$x \in A$
- 不属于：$x \notin B$
- 子集：$A \subseteq B$
- 空集：$\emptyset$

## 测试结果

如果你能看到上面所有的数学公式都正确渲染，说明 KaTeX 配置成功！

