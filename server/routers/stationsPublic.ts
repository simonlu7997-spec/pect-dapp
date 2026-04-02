import { publicProcedure, router } from "../_core/trpc";
import { listStations } from "../db";

export const stationsPublicRouter = router({
  // 公开查询活跃电站（首页使用）
  list: publicProcedure.query(async () => {
    const stationList = await listStations(true);
    return { stations: stationList };
  }),
});
