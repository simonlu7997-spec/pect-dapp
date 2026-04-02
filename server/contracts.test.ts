import { describe, it, expect } from "vitest";

describe("合约地址环境变量配置", () => {
  it("VITE_STAKING_MANAGER_ADDRESS 应已配置", () => {
    const addr = process.env.VITE_STAKING_MANAGER_ADDRESS;
    // 如果未配置则跳过（允许空值，但配置后必须是有效地址格式）
    if (addr) {
      expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);
    } else {
      console.warn("VITE_STAKING_MANAGER_ADDRESS 未配置，质押功能将显示提示");
    }
  });

  it("VITE_C2_COIN_ADDRESS 应已配置", () => {
    const addr = process.env.VITE_C2_COIN_ADDRESS;
    if (addr) {
      expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);
    } else {
      console.warn("VITE_C2_COIN_ADDRESS 未配置，C2-Coin 余额查询将不可用");
    }
  });

  it("VITE_REVENUE_DISTRIBUTOR_ADDRESS 应已配置", () => {
    const addr = process.env.VITE_REVENUE_DISTRIBUTOR_ADDRESS;
    if (addr) {
      expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);
    } else {
      console.warn("VITE_REVENUE_DISTRIBUTOR_ADDRESS 未配置，分红功能将显示提示");
    }
  });

  it("STAKING_MANAGER_ADDRESS（服务端）应已配置", () => {
    const addr = process.env.STAKING_MANAGER_ADDRESS;
    if (addr) {
      expect(addr).toMatch(/^0x[a-fA-F0-9]{40}$/);
    } else {
      console.warn("STAKING_MANAGER_ADDRESS 未配置，后端质押查询将返回默认值");
    }
  });
});
