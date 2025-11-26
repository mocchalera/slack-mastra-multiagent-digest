import { z } from "zod";

export const ResourceSchema = z.object({
  resources: z.array(
    z.object({
      url: z.string().nullable(),
      title: z.string(),
      summary: z.string(),
      contributor: z.string().nullable(),
      contributor_id: z.string().nullable(), // <@U...> 形式のID
      permalink: z.string().nullable(), // 元投稿へのリンク
      tags: z.array(z.string()),
    })
  ),
});

export const AwardSchema = z.object({
  mvp_user: z.string(),
  mvp_user_id: z.string().nullable(), // <@U...> 形式のID
  mvp_reason: z.string(),
  best_post_content: z.string(),
  best_post_permalink: z.string().nullable(), // 元投稿へのリンク
  best_post_reason: z.string(),
});
