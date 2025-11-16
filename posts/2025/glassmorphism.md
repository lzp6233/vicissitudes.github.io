# CSS 玻璃态效果(自动生成)

> 摘要：用 backdrop-filter 构建半透明磨砂与霓虹渐变

- 日期：2025-11-08
- 标签：前端, CSS

## 背景
现代 UI 常见的玻璃态（Glassmorphism）通过半透明背景与模糊营造层次。

## 核心概念
- 半透明层：`background: rgba(..., .5)`
- 模糊：`backdrop-filter: blur(10px)`
- 光效：渐变与阴影叠加

## 示例与代码
```css
.card{
  background: rgba(17,24,39,.6);
  backdrop-filter: saturate(1.4) blur(10px);
  border: 1px solid rgba(148,163,184,.18);
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
}
```

## 常见坑
- 透明度过高导致文字不清晰
- 模糊性能影响，注意移动端优化

## 参考资料
- MDN: backdrop-filter