import { describe, it, expect } from "vitest";
import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

describe("Purchase contract config", () => {
  it("PRIVATE_SALE_ADDRESS 是有效的以太坊地址", () => {
    const addr = process.env.PRIVATE_SALE_ADDRESS;
    if (!addr || addr === "0x0000000000000000000000000000000000000000") {
      console.warn("PRIVATE_SALE_ADDRESS 未配置，跳过验证");
      return;
    }
    expect(ethers.isAddress(addr)).toBe(true);
  });

  it("USDT_ADDRESS 是有效的以太坊地址", () => {
    const addr = process.env.USDT_ADDRESS;
    if (!addr || addr === "0x0000000000000000000000000000000000000000") {
      console.warn("USDT_ADDRESS 未配置，跳过验证");
      return;
    }
    expect(ethers.isAddress(addr)).toBe(true);
  });

  it("BLOCKCHAIN_RPC_URL 已配置", () => {
    const rpc = process.env.BLOCKCHAIN_RPC_URL;
    if (!rpc) {
      console.warn("BLOCKCHAIN_RPC_URL 未配置，将使用默认 Amoy RPC");
      return;
    }
    expect(rpc).toMatch(/^https?:\/\//);
  });
});
