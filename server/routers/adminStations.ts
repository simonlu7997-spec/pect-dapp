import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import {
  listStations,
  createStation,
  updateStation,
  deleteStation,
} from "../db";

// 管理员权限中间件
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "需要管理员权限" });
  }
  return next({ ctx });
});

export const adminStationsRouter = router({
  // 查询所有电站（管理员可见全部，含停用）
  list: adminProcedure.query(async () => {
    const stationList = await listStations(false);
    return { stations: stationList };
  }),

  // 新增电站
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(128),
        capacity: z.string().min(1).max(32),
        location: z.string().min(1).max(128),
        annualGeneration: z.string().regex(/^\d+(\.\d+)?$/, "请输入有效的发电量"),
        annualRevenue: z.string().regex(/^\d+(\.\d+)?$/, "请输入有效的收入金额"),
        description: z.string().max(500).optional(),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      })
    )
    .mutation(async ({ input }) => {
      await createStation({
        name: input.name,
        capacity: input.capacity,
        location: input.location,
        annualGeneration: input.annualGeneration,
        annualRevenue: input.annualRevenue,
        description: input.description ?? null,
        isActive: input.isActive,
        sortOrder: input.sortOrder,
      });
      return { success: true };
    }),

  // 更新电站
  update: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(128).optional(),
        capacity: z.string().min(1).max(32).optional(),
        location: z.string().min(1).max(128).optional(),
        annualGeneration: z.string().regex(/^\d+(\.\d+)?$/).optional(),
        annualRevenue: z.string().regex(/^\d+(\.\d+)?$/).optional(),
        description: z.string().max(500).optional().nullable(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateStation(id, data);
      return { success: true };
    }),

  // 删除电站
  delete: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await deleteStation(input.id);
      return { success: true };
    }),
});
