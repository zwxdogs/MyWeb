import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';

// 四个内容集合的加载器。
//
// 本文件只负责「集合存在、目录在哪、条目怎么匹配」。每个集合的字段契约（schema）
// 分别由后续内容票补齐：论文 #11、项目 #12、分享 #13、个人介绍 #14。
// 因此这里暂时没有 schema：内容目录为空时 getCollection() 返回 []，页面走空态。
//
// 「一篇一个文件夹」是所有集合的统一组织方式：目录名即 slug，图放同目录，
// 删内容 = 删一个文件夹（图不会变成孤儿）。

const papers = defineCollection({
  loader: glob({ base: './src/content/papers', pattern: '**/index.md' }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/index.md' }),
});

const notes = defineCollection({
  loader: glob({ base: './src/content/notes', pattern: '**/index.md' }),
});

const profile = defineCollection({
  loader: glob({ base: './src/content/profile', pattern: '**/index.md' }),
});

export const collections = { papers, projects, notes, profile };
