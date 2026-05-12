/**
 * 电站现场快照路由
 *
 * 公开接口：
 *   stationSnapshots.getLatest - 查询每个电站每个通道的最新快照
 *
 * 管理员接口：
 *   stationSnapshots.triggerCapture - 手动触发全站抓图
 *   stationSnapshots.listRecent - 查询最近 N 条快照记录
 */

import { z } from "zod";
import { desc, eq, and, sql } from "drizzle-orm";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { stationSnapshots } from "../../drizzle/schema";
import { runStationCapture } from "../hikiotScheduler";
import { getStationCameras } from "../hikiotService";

export const stationSnapshotsRouter = router({
  /**
   * 查询每个电站每个通道的最新快照（公开接口）
   * 返回格式：按电站名称分组，每组包含该站所有通道的最新图片
   */
  getLatest: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { groups: [] };

    // 使用子查询获取每个 (deviceSerial, channelNo) 组合的最新快照
    const latestSnapshots = await db
      .select()
      .from(stationSnapshots)
      .orderBy(desc(stationSnapshots.capturedAt))
      .limit(100);

    // 按 (deviceSerial, channelNo) 去重，只保留最新的
    const seen = new Set<string>();
    const deduped = latestSnapshots.filter(snap => {
      const key = `${snap.deviceSerial}:${snap.channelNo}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 按电站名称分组
    const groupMap = new Map<string, typeof deduped>();
    for (const snap of deduped) {
      const group = groupMap.get(snap.stationName) ?? [];
      group.push(snap);
      groupMap.set(snap.stationName, group);
    }

    const groups = Array.from(groupMap.entries()).map(([stationName, snapshots]) => ({
      stationName,
      snapshots: snapshots.map(s => ({
        id: s.id,
        deviceSerial: s.deviceSerial,
        channelNo: s.channelNo,
        imageUrl: s.imageUrl,
        capturedAt: s.capturedAt,
      })),
    }));

    return { groups };
  }),

  /**
   * 管理员手动触发全站抓图
   */
  triggerCapture: adminProcedure.mutation(async () => {
    const result = await runStationCapture("manual");
    return result;
  }),

  /**
   * 查询最近 N 条快照记录（管理员）
   */
  listRecent: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(200).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { snapshots: [] };

      const rows = await db
        .select()
        .from(stationSnapshots)
        .orderBy(desc(stationSnapshots.capturedAt))
        .limit(input.limit);

      return { snapshots: rows };
    }),

  /**
   * 查询已配置的摄像头列表（管理员）
   */
  getCameraConfig: adminProcedure.query(() => {
    return { cameras: getStationCameras() };
  }),
});
