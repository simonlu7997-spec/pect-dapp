import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { announcements, announcementReads } from "../../drizzle/schema";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

/** 管理员权限中间件 */
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

export const announcementsRouter = router({
  /**
   * 公开：获取已发布公告列表（按发布时间倒序）
   */
  list: publicProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;
      const db = await getDb();
      if (!db) return { announcements: [] };

      const rows = await db
        .select()
        .from(announcements)
        .where(eq(announcements.isPublished, true))
        .orderBy(desc(announcements.publishedAt))
        .limit(limit)
        .offset(offset);

      return { announcements: rows };
    }),

  /**
   * 登录用户：获取自己已读的公告 ID 列表
   */
  getReadIds: protectedProcedure.query(async ({ ctx }) => {
    const walletAddress = ctx.user.openId;
    const db = await getDb();
    if (!db) return { readIds: [] };

    const rows = await db
      .select({ announcementId: announcementReads.announcementId })
      .from(announcementReads)
      .where(eq(announcementReads.walletAddress, walletAddress));
    return { readIds: rows.map((r) => r.announcementId) };
  }),

  /**
   * 登录用户：标记公告为已读
   */
  markRead: protectedProcedure
    .input(z.object({ announcementId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const walletAddress = ctx.user.openId;
      const db = await getDb();
      if (!db) return { success: false };

      // 检查是否已读过
      const existing = await db
        .select({ id: announcementReads.id })
        .from(announcementReads)
        .where(
          and(
            eq(announcementReads.announcementId, input.announcementId),
            eq(announcementReads.walletAddress, walletAddress)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(announcementReads).values({
          announcementId: input.announcementId,
          walletAddress,
        });
      }
      return { success: true };
    }),

  /**
   * 登录用户：批量标记多条公告为已读
   */
  markAllRead: protectedProcedure
    .input(z.object({ announcementIds: z.array(z.number()) }))
    .mutation(async ({ ctx, input }) => {
      if (input.announcementIds.length === 0) return { success: true };
      const walletAddress = ctx.user.openId;
      const db = await getDb();
      if (!db) return { success: false };

      // 查询已读的
      const existing = await db
        .select({ announcementId: announcementReads.announcementId })
        .from(announcementReads)
        .where(
          and(
            inArray(announcementReads.announcementId, input.announcementIds),
            eq(announcementReads.walletAddress, walletAddress)
          )
        );
      const alreadyReadIds = new Set(existing.map((r) => r.announcementId));
      const toInsert = input.announcementIds.filter(
        (id) => !alreadyReadIds.has(id)
      );

      if (toInsert.length > 0) {
        await db.insert(announcementReads).values(
          toInsert.map((announcementId) => ({ announcementId, walletAddress }))
        );
      }
      return { success: true };
    }),

  // ─── 管理员专用路由 ────────────────────────────────────────────────

  /**
   * 管理员：获取所有公告（含未发布）
   */
  adminList: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { announcements: [] };

    const rows = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));
    return { announcements: rows };
  }),

  /**
   * 管理员：创建公告
   */
  create: adminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(256),
        content: z.string().min(1),
        isPublished: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      const now = new Date();
      const [result] = await db.insert(announcements).values({
        title: input.title,
        content: input.content,
        isPublished: input.isPublished,
        publishedAt: input.isPublished ? now : null,
        createdBy: ctx.user.openId,
      });
      return { success: true, id: Number(result.insertId) };
    }),

  /**
   * 管理员：更新公告
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(256).optional(),
        content: z.string().min(1).optional(),
        isPublished: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.isPublished !== undefined) {
        updateData.isPublished = input.isPublished;
        if (input.isPublished) {
          // 只在首次发布时设置 publishedAt
          const existing = await db
            .select({ publishedAt: announcements.publishedAt })
            .from(announcements)
            .where(eq(announcements.id, input.id))
            .limit(1);
          if (existing.length > 0 && !existing[0].publishedAt) {
            updateData.publishedAt = new Date();
          }
        }
      }
      await db
        .update(announcements)
        .set(updateData)
        .where(eq(announcements.id, input.id));
      return { success: true };
    }),

  /**
   * 管理员：删除公告
   */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库不可用" });

      // 同时删除已读记录
      await db
        .delete(announcementReads)
        .where(eq(announcementReads.announcementId, input.id));
      await db.delete(announcements).where(eq(announcements.id, input.id));
      return { success: true };
    }),
});
