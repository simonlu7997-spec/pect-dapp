import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
const BRAND_NAME = "PECT DApp";
const BRAND_COLOR = "#059669"; // emerald-600

// ── HTML 邮件基础布局 ─────────────────────────────────────────────────
function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${BRAND_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background:${BRAND_COLOR};padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display:inline-flex;align-items:center;gap:8px;">
                      <div style="width:32px;height:32px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-block;text-align:center;line-height:32px;">
                        <span style="color:#fff;font-weight:bold;font-size:14px;">P</span>
                      </div>
                      <span style="color:#ffffff;font-size:18px;font-weight:700;margin-left:8px;">${BRAND_NAME}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
                此邮件由 ${BRAND_NAME} 系统自动发送，请勿直接回复。<br />
                如有疑问，请联系 <a href="mailto:support@pect.io" style="color:${BRAND_COLOR};">support@pect.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── 审核通过邮件模板 ─────────────────────────────────────────────────
function buildApprovedEmail(opts: {
  fullName: string;
  walletAddress: string;
  txHashKyc?: string;
  txHashSender?: string;
}): string {
  const shortAddr = `${opts.walletAddress.slice(0, 8)}...${opts.walletAddress.slice(-6)}`;
  const txSection = (opts.txHashKyc || opts.txHashSender) ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#166534;">📋 链上交易记录</p>
      ${opts.txHashKyc ? `
      <p style="margin:4px 0;font-size:12px;color:#374151;">
        KYC 认证：
        <a href="https://amoy.polygonscan.com/tx/${opts.txHashKyc}" style="color:#059669;word-break:break-all;">
          ${opts.txHashKyc.slice(0, 20)}...
        </a>
      </p>` : ""}
      ${opts.txHashSender ? `
      <p style="margin:4px 0;font-size:12px;color:#374151;">
        白名单添加：
        <a href="https://amoy.polygonscan.com/tx/${opts.txHashSender}" style="color:#059669;word-break:break-all;">
          ${opts.txHashSender.slice(0, 20)}...
        </a>
      </p>` : ""}
    </div>` : "";

  return baseLayout(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;background:#d1fae5;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:28px;">✅</span>
      </div>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;">KYC 审核通过</h1>
    </div>

    <p style="color:#374151;font-size:15px;line-height:1.6;">
      尊敬的 <strong>${opts.fullName}</strong>，
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      恭喜您！您提交的 KYC 白名单申请已通过审核，您的钱包地址已成功加入 PVCoin 合约白名单。
    </p>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:500;">已认证钱包地址</p>
      <p style="margin:0;font-size:14px;font-family:monospace;color:#111827;word-break:break-all;">${opts.walletAddress}</p>
    </div>

    ${txSection}

    <p style="color:#374151;font-size:14px;line-height:1.6;">
      您现在可以：
    </p>
    <ul style="color:#374151;font-size:14px;line-height:1.8;padding-left:20px;">
      <li>参与 PVCoin 私募轮购买</li>
      <li>进行 PVCoin 代币转账</li>
      <li>质押 C2-Coin 获取收益</li>
    </ul>

    <div style="text-align:center;margin-top:28px;">
      <a href="https://pectdapp-8stzafg6.manus.space/buy"
         style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
        立即购买 PVCoin →
      </a>
    </div>
  `);
}

// ── 审核拒绝邮件模板 ─────────────────────────────────────────────────
function buildRejectedEmail(opts: {
  fullName: string;
  walletAddress: string;
  reviewNote: string;
}): string {
  return baseLayout(`
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:56px;height:56px;background:#fee2e2;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:28px;">❌</span>
      </div>
      <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;">KYC 申请未通过</h1>
    </div>

    <p style="color:#374151;font-size:15px;line-height:1.6;">
      尊敬的 <strong>${opts.fullName}</strong>，
    </p>
    <p style="color:#374151;font-size:15px;line-height:1.6;">
      很遗憾，您提交的 KYC 白名单申请未能通过审核。
    </p>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:12px;color:#991b1b;font-weight:600;">拒绝原因</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${opts.reviewNote}</p>
    </div>

    <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:20px 0;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:500;">申请钱包地址</p>
      <p style="margin:0;font-size:14px;font-family:monospace;color:#111827;word-break:break-all;">${opts.walletAddress}</p>
    </div>

    <p style="color:#374151;font-size:14px;line-height:1.6;">
      您可以根据上述原因修改信息后，重新前往白名单页面提交申请。如有疑问，请联系我们。
    </p>

    <div style="text-align:center;margin-top:28px;">
      <a href="https://pectdapp-8stzafg6.manus.space/whitelist"
         style="display:inline-block;background:#6b7280;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;">
        重新申请 →
      </a>
    </div>
  `);
}

// ── 公开接口 ─────────────────────────────────────────────────────────

export async function sendApprovedEmail(opts: {
  to: string;
  fullName: string;
  walletAddress: string;
  txHashKyc?: string;
  txHashSender?: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping email");
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `✅ 您的 ${BRAND_NAME} KYC 申请已通过审核`,
      html: buildApprovedEmail(opts),
    });
    if (error) {
      console.error("[Email] Failed to send approved email:", error);
      return false;
    }
    console.log(`[Email] Approved email sent to ${opts.to}`);
    return true;
  } catch (err) {
    console.error("[Email] Error sending approved email:", err);
    return false;
  }
}

export async function sendRejectedEmail(opts: {
  to: string;
  fullName: string;
  walletAddress: string;
  reviewNote: string;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping email");
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: `❌ 您的 ${BRAND_NAME} KYC 申请未通过审核`,
      html: buildRejectedEmail(opts),
    });
    if (error) {
      console.error("[Email] Failed to send rejected email:", error);
      return false;
    }
    console.log(`[Email] Rejected email sent to ${opts.to}`);
    return true;
  } catch (err) {
    console.error("[Email] Error sending rejected email:", err);
    return false;
  }
}
