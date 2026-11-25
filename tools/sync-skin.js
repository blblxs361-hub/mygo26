/**
 * sync-skin.js —— 把 skin.css 同步进 _worker.js 的 SKIN 段
 *
 * 为什么需要它：Worker 是单文件部署，样式必须内联在 _worker.js 里；
 * 但直接编辑那 5MB 文件里的 CSS 字符串既难读也难维护，
 * 所以约定：**样式只改 skin.css**，改完执行本脚本回写。
 *
 * 用法（在仓库根目录）：
 *   node tools/sync-skin.js          写入
 *   node tools/sync-skin.js --check  只校验是否一致（CI 可用，不一致时退出码 1）
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cssPath = path.join(root, 'skin.css');
const workerPath = path.join(root, '_worker.js');

const START = '/* SKIN:START';
const END = '/* SKIN:END */';

const css = fs.readFileSync(cssPath, 'utf8');
const src = fs.readFileSync(workerPath, 'utf8');

const startIdx = src.indexOf(START);
const endIdx = src.indexOf(END);
if (startIdx < 0 || endIdx < 0) {
	console.error('✗ _worker.js 中没有找到 SKIN:START / SKIN:END 标记');
	process.exit(1);
}

// 定位 const 皮肤CSS = String.raw`...`;  的字符串区间
const lineStart = src.indexOf('const 皮肤CSS = String.raw`', startIdx);
if (lineStart < 0) {
	console.error('✗ 没有找到 const 皮肤CSS 声明');
	process.exit(1);
}
const openQuote = src.indexOf('`', lineStart);
const closeQuote = src.indexOf('`;', openQuote);
if (closeQuote < 0 || closeQuote > endIdx) {
	console.error('✗ 皮肤CSS 模板字符串没有正确闭合');
	process.exit(1);
}

const current = src.slice(openQuote + 1, closeQuote);
const same = current === css;

if (process.argv.includes('--check')) {
	if (same) {
		console.log('✓ skin.css 与 _worker.js 已一致');
	} else {
		console.error('✗ 不一致：请执行 node tools/sync-skin.js 后再提交');
		process.exit(1);
	}
	process.exit(0);
}

if (same) {
	console.log('✓ 已是最新，无需写入');
	process.exit(0);
}

const next = src.slice(0, openQuote + 1) + css + src.slice(closeQuote);
fs.writeFileSync(workerPath, next, 'utf8');
console.log(`✓ 已同步 skin.css → _worker.js（CSS ${css.length} 字符）`);
