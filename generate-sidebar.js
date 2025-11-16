#!/usr/bin/env node

/**
 * 自动生成 _sidebar.md
 * 使用方法：node generate-sidebar.js
 */

const fs = require('fs');
const path = require('path');

// 配置
const POSTS_DIR = './posts/2025';
const OUTPUT_FILE = './_sidebar.md';

// 文件夹到分类的映射（可自定义）
const CATEGORY_MAP = {
  'algorithm': '📚 算法笔记',
  'GENAI': '🤖 AI 笔记',
  'frontend': '🎨 前端技术',
  'weekly': '📝 周记'
};

// 读取文件的标题（第一行 # 标题）
function getTitle(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1] : path.basename(filePath, '.md');
  } catch (e) {
    return path.basename(filePath, '.md');
  }
}

// 读取文件的日期（从元数据或文件名）
function getDate(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/日期[：:]\s*(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    
    // 尝试从文件名提取日期
    const dateMatch = path.basename(filePath).match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) return dateMatch[1];
    
    // 使用文件修改时间
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

// 递归读取目录
function scanDirectory(dir) {
  const result = {};
  
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️  目录不存在: ${dir}`);
    return result;
  }
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  // 先处理子文件夹
  for (const item of items) {
    if (item.isDirectory()) {
      const subDir = path.join(dir, item.name);
      const files = [];
      
      // 读取子文件夹中的 .md 文件
      const subItems = fs.readdirSync(subDir);
      for (const file of subItems) {
        if (file.endsWith('.md')) {
          const filePath = path.join(subDir, file);
          const title = getTitle(filePath);
          const date = getDate(filePath);
          const relativePath = path.relative('.', filePath);
          files.push({ title, path: relativePath, date });
        }
      }
      
      // 按日期排序（最新的在前）
      files.sort((a, b) => b.date.localeCompare(a.date));
      
      if (files.length > 0) {
        result[item.name] = files;
      }
    }
  }
  
  // 处理根目录下的 .md 文件（如果有）
  const rootFiles = [];
  for (const item of items) {
    if (item.isFile() && item.name.endsWith('.md')) {
      const filePath = path.join(dir, item.name);
      const title = getTitle(filePath);
      const date = getDate(filePath);
      const relativePath = path.relative('.', filePath);
      rootFiles.push({ title, path: relativePath, date });
    }
  }
  
  if (rootFiles.length > 0) {
    rootFiles.sort((a, b) => b.date.localeCompare(a.date));
    result['_root'] = rootFiles;
  }
  
  return result;
}

// 生成 sidebar 内容
function generateSidebar() {
  const categories = scanDirectory(POSTS_DIR);
  
  let content = '* [首页](/)\n';
  content += '* [关于](about.md)\n';
  content += '* [归档](posts/index.md)\n';
  content += '* [分类](categories.md)\n';
  
  // 处理根目录文件
  if (categories['_root']) {
    content += '* 📄 文章\n';
    for (const file of categories['_root']) {
      content += `  * [${file.title}](${file.path})\n`;
    }
    delete categories['_root'];
  }
  
  // 按分类生成
  const sortedCategories = Object.keys(categories).sort();
  for (const folder of sortedCategories) {
    const files = categories[folder];
    const categoryName = CATEGORY_MAP[folder] || `📁 ${folder}`;
    content += `* ${categoryName}\n`;
    
    for (const file of files) {
      content += `  * [${file.title}](${file.path})\n`;
    }
  }
  
  return content;
}

// 主函数
function main() {
  try {
    console.log('🔍 扫描文章目录...');
    const sidebar = generateSidebar();
    
    fs.writeFileSync(OUTPUT_FILE, sidebar, 'utf-8');
    
    console.log('✅ _sidebar.md 生成成功！');
    console.log('\n📝 内容预览：');
    console.log('─'.repeat(50));
    console.log(sidebar);
    console.log('─'.repeat(50));
    console.log(`\n💾 已保存到: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ 生成失败：', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

