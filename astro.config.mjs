// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // 纯静态导出：astro build 会在 dist/ 里生成可直接上传的静态站点
  output: 'static',

  // 你的正式域名（用于生成绝对 URL / sitemap）
  site: 'https://www.shedio.life',

  // 若要部署到子目录（如 https://x.com/shedio/），把 base 改成 '/shedio'
  // base: '/',

  // 目录式产物：/about/ -> about/index.html，任何服务器直接上传即可访问
  build: { format: 'directory' },

  // 本地验收时隐藏 Astro 自带的底部工具条；正式构建本来也不会包含它。
  devToolbar: { enabled: false },

  trailingSlash: 'ignore',
});
