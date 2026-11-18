// @ts-check
import { defineConfig } from 'astro/config';

// 纯静态输出：不装 adapter、不写服务端逻辑，产物是 dist/ 里的一堆静态文件。
export default defineConfig({
  // 第一道防静默失效的防线（设计稿 §8.1）：两个内容条目撞同一个 slug 时，
  // 默认值 'warn' 只打一条警告、构建照样成功，然后静默丢掉其中一篇，而且
  // 「谁被覆盖」没有契约——换台机器可能反过来。
  // 改成 'error' 之后这种情况直接构建失败。注意：失败时退出码不是 1
  // （本机实测是 -1073740791 / 0xC0000409），所以任何脚本只能断言「非零」。
  prerenderConflictBehavior: 'error',
});
