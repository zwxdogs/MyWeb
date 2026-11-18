import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// 四个内容集合的加载器 + 字段契约。
//
// 「一篇一个文件夹」是所有集合的统一组织方式：目录名即 slug，图放同目录，
// 删内容 = 删一个文件夹（图不会变成孤儿）。
//
// schema 只管结构不变量（写错页面就是坏的），不管编辑品味（写错只是编得不好）：
// 管 slug 格式、必填缺失、图片路径不存在、替代文字缺失、me 恰好一次；
// 不管配几张图、摘要写多长、正文写几段。
//
// 论文的字段契约在 #11 落地；项目 #12 / 分享 #13 / 个人介绍 #14 照它的形状补。

/** slug 的格式契约：全小写、连字符分隔，不许下划线、不许首尾或连续连字符。 */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slug = z
  .string()
  .regex(SLUG_PATTERN, 'slug 必须是全小写、用连字符分隔的形态，例如 deep-residual-learning');

/** 简介 40–400 字。按字符（码点）计数，不是按字节。 */
const summaryText = z
  .string()
  .refine((value) => [...value.trim()].length >= 40, 'summary 少于 40 字，太短看不出做了什么')
  .refine((value) => [...value.trim()].length <= 400, 'summary 多于 400 字，这段是简介不是正文');

/** 作者：`me: true` 必须恰好出现一次，0 次或 2 次都构建失败。 */
const authors = z
  .array(
    z.object({
      name: z.string().min(1, '作者名不能为空'),
      me: z.boolean().optional(),
    }),
  )
  .min(1, 'authors 至少要有 1 位作者')
  .refine((list) => list.filter((author) => author.me === true).length === 1, {
    message: 'authors 里 me: true 必须恰好出现一次（0 次会不知道你是谁，2 次会不知道宣传谁）',
  });

const papers = defineCollection({
  loader: glob({ base: './src/content/papers', pattern: '**/index.md' }),
  schema: ({ image }) =>
    z.object({
      /** URL 段，发布后不可变；必须等于所在目录名（由预检保证）。 */
      slug,
      title_en: z.string().min(1, '英文原名不能为空'),
      title_zh: z.string().min(1, '中文标题不能为空'),
      /** 排序第一级。 */
      year: z.number().int().min(1990).max(2100),
      /** 排序第二级（同年多篇要有确定的先后）。 */
      month: z.number().int().min(1).max(12),
      /** 已含年份，元信息行只渲染它一项，不再拼 year。 */
      venue: z.string().min(1, '会议 / 期刊名不能为空'),
      authors,
      /** 只记录「你在这篇里的角色」，据此决定徽标。 */
      my_role: z.enum(['first', 'co-first', 'corresponding', 'coauthor']),
      summary: summaryText,
      /** 裸 DOI：不带 https://doi.org/ 前缀，链接由模板拼。 */
      doi: z
        .string()
        .regex(/^10\.\d{4,9}\/\S+$/, 'doi 要写裸 DOI（如 10.1109/CVPR.2016.90），不要带 https://doi.org/ 前缀')
        .optional(),
      code_url: z.url('code_url 必须是完整 URL').optional(),
      /**
       * 配图：不设上限；第一张即封面；caption 兼作替代文字。
       *
       * 为什么**允许 0 张**（设计稿 §16 B7 的预案，条件已发生）：闭源期刊的论文
       * 拿不到授权转载原图，硬要求「至少一张」等于逼人要么不放这篇、要么破例去
       * 盗图。允许为空之后，这篇论文照常出现在列表与详情页，只是没有封面。
       *
       * 放开这一条**不削弱**图片防线：路径写错仍然构建失败（`image()` 找不到文件
       * 就报 ImageNotFound），图注空也仍然构建失败。少掉的只是「这张纸必须配图」
       * 这条编辑品味。
       */
      figures: z
        .array(
          z.object({
            src: image(),
            caption: z.string().min(1, '图注不能为空——它同时是图片的替代文字'),
          }),
        )
        .default([]),
    }),
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
