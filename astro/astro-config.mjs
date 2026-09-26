/* lishui-kit · Astro 构建配置工厂
 *
 * 三站的 astro.config.mjs 只差 site 一行，收成一处，各站只填自己的域名。
 *
 * 纯静态输出：内容库的 Markdown 在构建时渲染成 HTML，产物不依赖数据库与客户端框架。
 * 页面路径由 src/pages/ 的目录结构决定，中文在根路径、英文在 /en/ 下，两者一一对应。
 *
 * 这里刻意不 import 'astro/config'：astro 是站点层的 devDependency，底座没装它，
 * 而底座文件按真实路径解析依赖时找不到它。defineConfig 在运行时只是恒等函数，
 * 返回普通对象即可，Astro 读默认导出时自己会归一化。
 *
 * lishui-kit 以 file: 依赖装在站点 node_modules 下，是符号链接；
 * preserveSymlinks 让 Vite 按链接路径解析，避免把 node_modules 之外的真实路径
 * 当成项目外文件处理。
 */

/** @param {{ site: string }} opts 本站域名，如 https://lishi.lishui.org */
export function makeAstroConfig({ site }) {
  return {
    site,
    output: 'static',
    build: { format: 'directory' },
    vite: {
      resolve: { preserveSymlinks: true },
      server: { fs: { allow: ['..'] } },
    },
  };
}
