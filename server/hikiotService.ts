/**
 * 海康互联开放平台 - 视频抓拍服务
 *
 * 接口文档：https://open.hikiot.com/documents/detail/11?docId=1934920493241249867
 *
 * 认证流程：
 * 1. App-Access-Token：通过 appKey + appSecret 获取（有效期 7200 秒）
 * 2. User-Access-Token：通过授权码流程获取，本项目直接使用预配置的静态 Token
 *
 * 抓图接口：POST /device/direct/v1/captureImage/captureImage
 * 请求参数（明文 JSON，无需加密）：
 *   { deviceSerial: string, payload: { channelNo: number } }
 * 响应：{ code: 0, data: { captureUrl: string } }
 */

import { ENV } from "./_core/env";
import { getDb } from "./db";
import { stationSnapshots } from "../drizzle/schema";

const HIK_BASE_URL = "https://open-api.hikiot.com";

/**
 * 电站摄像头配置
 * 每个电站配置一个设备序列号和通道号
 */
export interface StationCamera {
  stationName: string;
  deviceSerial: string;
  channelNo: number;
}

/**
 * 默认电站摄像头配置（从环境变量读取，或使用预设值）
 * 管理员可通过环境变量 HIK_CAMERAS 覆盖（JSON 格式）
 */
export function getStationCameras(): StationCamera[] {
  const envCameras = process.env.HIK_CAMERAS;
  if (envCameras) {
    try {
      return JSON.parse(envCameras) as StationCamera[];
    } catch {
      console.warn("[HikIot] HIK_CAMERAS 解析失败，使用默认配置");
    }
  }
  // 默认配置：三个电站，每站一个摄像头
  // 设备序列号需要在海康互联控制台查询
  return [
    { stationName: "工商业屋顶电站", deviceSerial: process.env.HIK_DEVICE_1 ?? "", channelNo: 1 },
    { stationName: "工商业屋顶电站", deviceSerial: process.env.HIK_DEVICE_1 ?? "", channelNo: 2 },
    { stationName: "电动科技电站",   deviceSerial: process.env.HIK_DEVICE_2 ?? "", channelNo: 1 },
    { stationName: "电动科技电站",   deviceSerial: process.env.HIK_DEVICE_2 ?? "", channelNo: 2 },
    { stationName: "汽车零部件电站", deviceSerial: process.env.HIK_DEVICE_3 ?? "", channelNo: 1 },
    { stationName: "汽车零部件电站", deviceSerial: process.env.HIK_DEVICE_3 ?? "", channelNo: 2 },
  ].filter(c => c.deviceSerial !== "");
}

/**
 * 调用海康互联视频抓拍接口
 * 返回图片 URL，失败时返回 null
 */
export async function captureImage(
  deviceSerial: string,
  channelNo: number,
  appAccessToken?: string,
  userAccessToken?: string
): Promise<string | null> {
  const appToken = appAccessToken ?? ENV.hikAppAccessToken;
  const userToken = userAccessToken ?? ENV.hikUserAccessToken;

  if (!appToken || !userToken) {
    console.warn("[HikIot] 缺少 App-Access-Token 或 User-Access-Token");
    return null;
  }

  if (!deviceSerial) {
    console.warn("[HikIot] 设备序列号为空，跳过抓图");
    return null;
  }

  const url = `${HIK_BASE_URL}/device/direct/v1/captureImage/captureImage`;
  const body = {
    deviceSerial,
    payload: { channelNo },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "App-Access-Token": appToken,
        "User-Access-Token": userToken,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      console.error(`[HikIot] HTTP 错误 ${resp.status}，设备 ${deviceSerial} 通道 ${channelNo}`);
      return null;
    }

    const json = await resp.json() as { code: number; msg?: string; data?: { captureUrl?: string } };

    if (json.code !== 0) {
      console.error(`[HikIot] 抓图失败 code=${json.code} msg=${json.msg}，设备 ${deviceSerial} 通道 ${channelNo}`);
      return null;
    }

    const captureUrl = json.data?.captureUrl ?? null;
    if (!captureUrl) {
      console.warn(`[HikIot] 抓图成功但 captureUrl 为空，设备 ${deviceSerial} 通道 ${channelNo}`);
    }
    return captureUrl;
  } catch (err) {
    console.error(`[HikIot] 抓图请求异常，设备 ${deviceSerial} 通道 ${channelNo}:`, err);
    return null;
  }
}

/**
 * 将抓图结果保存到数据库
 */
export async function saveSnapshot(
  deviceSerial: string,
  channelNo: number,
  stationName: string,
  imageUrl: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[HikIot] 数据库不可用，跳过保存快照");
    return;
  }

  await db.insert(stationSnapshots).values({
    deviceSerial,
    channelNo,
    stationName,
    imageUrl,
    capturedAt: new Date(),
  });
}

/**
 * 批量抓图并保存到数据库
 * 对所有已配置的摄像头依次抓图，失败的跳过
 */
export async function captureAllStations(): Promise<{
  success: number;
  failed: number;
  results: Array<{ stationName: string; deviceSerial: string; channelNo: number; imageUrl: string | null }>;
}> {
  const cameras = getStationCameras();

  if (cameras.length === 0) {
    console.warn("[HikIot] 未配置任何摄像头（HIK_DEVICE_1/2/3 均为空），跳过抓图");
    return { success: 0, failed: 0, results: [] };
  }

  console.log(`[HikIot] 开始批量抓图，共 ${cameras.length} 个摄像头`);

  const results: Array<{ stationName: string; deviceSerial: string; channelNo: number; imageUrl: string | null }> = [];
  let success = 0;
  let failed = 0;

  for (const camera of cameras) {
    const imageUrl = await captureImage(camera.deviceSerial, camera.channelNo);
    results.push({ ...camera, imageUrl });

    if (imageUrl) {
      await saveSnapshot(camera.deviceSerial, camera.channelNo, camera.stationName, imageUrl);
      success++;
      console.log(`[HikIot] 抓图成功：${camera.stationName} 通道${camera.channelNo}`);
    } else {
      failed++;
      console.warn(`[HikIot] 抓图失败：${camera.stationName} 通道${camera.channelNo}`);
    }

    // 每次抓图间隔 500ms，避免触发频率限制（2次/秒）
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`[HikIot] 批量抓图完成：成功 ${success}，失败 ${failed}`);
  return { success, failed, results };
}
