/**
 * 海康互联电站现场自动抓图定时任务
 *
 * 执行策略：
 * - 每天 08:00 UTC+8 自动触发（光线充足，图像清晰）
 * - 同时也支持管理员手动触发
 * - 任务锁防止并发执行
 */

import { captureAllStations } from "./hikiotService";
import { notifyOwner } from "./_core/notification";

let isRunning = false;

/**
 * 执行一次全站抓图
 */
export async function runStationCapture(triggeredBy: "scheduler" | "manual" = "scheduler"): Promise<{
  success: boolean;
  successCount: number;
  failedCount: number;
  error?: string;
}> {
  if (isRunning) {
    console.warn("[HikIotScheduler] 任务正在执行中，跳过本次触发");
    return { success: false, successCount: 0, failedCount: 0, error: "任务正在执行中" };
  }

  isRunning = true;
  try {
    console.log(`[HikIotScheduler] 开始电站现场抓图（触发方式: ${triggeredBy}）`);
    const result = await captureAllStations();

    const summary = [
      `电站现场抓图完成`,
      `成功: ${result.success} 张`,
      `失败: ${result.failed} 张`,
      `触发方式: ${triggeredBy}`,
      `时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
    ].join("\n");

    if (result.success > 0) {
      await notifyOwner({
        title: "📸 电站现场抓图完成",
        content: summary,
      }).catch(e => console.warn("[HikIotScheduler] notifyOwner 失败:", e));
    }

    return { success: true, successCount: result.success, failedCount: result.failed };
  } catch (err) {
    const errorMsg = (err as Error).message;
    console.error("[HikIotScheduler] 抓图任务失败:", errorMsg);

    await notifyOwner({
      title: "❌ 电站现场抓图失败",
      content: `错误信息: ${errorMsg}\n时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`,
    }).catch(() => {});

    return { success: false, successCount: 0, failedCount: 0, error: errorMsg };
  } finally {
    isRunning = false;
  }
}

/**
 * 计算距下次每日 08:00 UTC+8 的毫秒数
 */
function msUntilNextDailyRun(): number {
  const now = new Date();
  // 转换为 UTC+8
  const utc8 = new Date(now.getTime() + 8 * 60 * 60 * 1000);

  // 今天 08:00 UTC+8
  const todayRun = new Date(Date.UTC(
    utc8.getUTCFullYear(),
    utc8.getUTCMonth(),
    utc8.getUTCDate(),
    0, 0, 0  // UTC 00:00 = UTC+8 08:00
  ));

  // 如果今天 08:00 已过，则等到明天
  if (todayRun.getTime() <= now.getTime()) {
    todayRun.setUTCDate(todayRun.getUTCDate() + 1);
  }

  return todayRun.getTime() - now.getTime();
}

/**
 * 启动每日定时抓图调度器
 */
export function startHikiotScheduler(): void {
  const msToNext = msUntilNextDailyRun();
  const hoursToNext = (msToNext / 1000 / 60 / 60).toFixed(2);
  console.log(`[HikIotScheduler] 已启动，距下次执行 ${hoursToNext} 小时（每日 08:00 UTC+8）`);

  function scheduleNext() {
    const ms = msUntilNextDailyRun();
    setTimeout(async () => {
      await runStationCapture("scheduler");
      scheduleNext(); // 执行完后安排下次
    }, ms);
  }

  scheduleNext();
}
