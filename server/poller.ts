/**
 * Transaction Status Poller
 * 每 60 秒轮询 pending 状态的交易，通过 RPC 查询链上状态并更新数据库
 */
import { ethers } from "ethers";
import { listPendingTransactions, updateTransactionStatus } from "./db";
import { ENV } from "./_core/env";

const POLL_INTERVAL_MS = 60_000; // 60 seconds
const TX_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes: mark as failed if still pending

let provider: ethers.JsonRpcProvider | null = null;
let pollTimer: ReturnType<typeof setTimeout> | null = null;

function getProvider(): ethers.JsonRpcProvider | null {
  if (!provider && ENV.blockchainRpcUrl) {
    try {
      provider = new ethers.JsonRpcProvider(ENV.blockchainRpcUrl);
    } catch (e) {
      console.warn("[Poller] Failed to create provider:", e);
    }
  }
  return provider;
}

async function pollPendingTransactions() {
  const rpc = getProvider();
  if (!rpc) {
    console.warn("[Poller] No RPC provider available, skipping poll");
    return;
  }

  let pending: Awaited<ReturnType<typeof listPendingTransactions>>;
  try {
    pending = await listPendingTransactions();
  } catch (e) {
    console.warn("[Poller] Failed to fetch pending transactions:", e);
    return;
  }

  if (pending.length === 0) return;

  console.log(`[Poller] Checking ${pending.length} pending transaction(s)...`);

  const now = Date.now();

  await Promise.allSettled(
    pending.map(async (tx) => {
      try {
        // Check if transaction has timed out (30 min)
        const age = now - new Date(tx.createdAt).getTime();
        if (age > TX_TIMEOUT_MS) {
          await updateTransactionStatus(tx.txHash, "failed", {
            errorMessage: "Transaction timed out after 30 minutes",
          });
          console.log(`[Poller] Marked ${tx.txHash.slice(0, 10)}... as failed (timeout)`);
          return;
        }

        // Query the transaction receipt from the blockchain
        const receipt = await rpc.getTransactionReceipt(tx.txHash);

        if (receipt === null) {
          // Still pending on chain, do nothing
          return;
        }

        if (receipt.status === 1) {
          // Success
          await updateTransactionStatus(tx.txHash, "confirmed", {
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            confirmedAt: new Date(),
          });
          console.log(`[Poller] Confirmed ${tx.txHash.slice(0, 10)}... at block ${receipt.blockNumber}`);
        } else {
          // Reverted
          await updateTransactionStatus(tx.txHash, "failed", {
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            errorMessage: "Transaction reverted on chain",
          });
          console.log(`[Poller] Reverted ${tx.txHash.slice(0, 10)}... at block ${receipt.blockNumber}`);
        }
      } catch (e) {
        console.warn(`[Poller] Error checking tx ${tx.txHash.slice(0, 10)}...:`, e);
      }
    })
  );
}

export function startPoller() {
  if (!ENV.blockchainRpcUrl) {
    console.warn("[Poller] BLOCKCHAIN_RPC_URL not configured, transaction poller disabled");
    return;
  }

  console.log(`[Poller] Starting transaction status poller (interval: ${POLL_INTERVAL_MS / 1000}s)`);

  // Run immediately on start, then every 60 seconds
  const run = async () => {
    try {
      await pollPendingTransactions();
    } catch (e) {
      console.error("[Poller] Unexpected error:", e);
    } finally {
      pollTimer = setTimeout(run, POLL_INTERVAL_MS);
    }
  };

  // Delay first run by 10 seconds to let the server fully start
  pollTimer = setTimeout(run, 10_000);
}

export function stopPoller() {
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
    console.log("[Poller] Transaction status poller stopped");
  }
}
