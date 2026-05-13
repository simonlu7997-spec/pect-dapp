import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import {
  insertContactMessage,
  getContactMessages,
  countContactMessagesByEmail,
} from "../db";
import { sendContactNotificationEmail } from "../email";
import { notifyOwner } from "../_core/notification";

/** 每小时最多允许同一邮箱提交的次数 */
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 小时

export const contactRouter = router({
  /**
   * 提交联系表单
   * - 防刷限流：同一邮箱每小时最多 3 次
   * - 存入 contact_messages 表
   * - 发送邮件通知到 26725856@qq.com
   * - 推送 Manus 站内通知
   */
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "姓名不能为空").max(128),
        email: z.string().email("请输入有效的邮箱地址").max(320),
        subject: z.string().min(1, "主题不能为空").max(256),
        message: z.string().min(1, "消息内容不能为空").max(5000),
      })
    )
    .mutation(async ({ input }) => {
      // 1. 防刷限流：检查该邮箱在过去 1 小时内的提交次数
      const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
      const recentCount = await countContactMessagesByEmail(input.email, since);
      if (recentCount >= RATE_LIMIT_MAX) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: `提交过于频繁，每小时最多提交 ${RATE_LIMIT_MAX} 次，请稍后再试。`,
        });
      }

      // 2. 存入数据库
      await insertContactMessage(input);

      // 3. 发送邮件通知（不阻塞，失败不影响用户体验）
      sendContactNotificationEmail(input).catch((err) =>
        console.error("[Contact] Email notification failed:", err)
      );

      // 4. 推送 Manus 站内通知（不阻塞）
      notifyOwner({
        title: `📬 新留言：${input.subject}`,
        content: `来自：${input.name}（${input.email}）\n\n${input.message}`,
      }).catch((err) =>
        console.error("[Contact] Owner notification failed:", err)
      );

      return { success: true };
    }),

  /**
   * 管理员查询留言列表（分页，按时间倒序）
   */
  list: adminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      return getContactMessages(input);
    }),
});
