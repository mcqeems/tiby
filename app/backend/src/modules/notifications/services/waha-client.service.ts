import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class WahaClientService {
  private readonly logger = new Logger(WahaClientService.name);

  private get isEnabled(): boolean {
    return process.env.WAHA_ENABLED === "true";
  }

  private get baseUrl(): string {
    return process.env.WAHA_BASE_URL || "http://localhost:3008";
  }

  private get session(): string {
    return process.env.WAHA_SESSION || "default";
  }

  private get apiKey(): string | undefined {
    return process.env.WAHA_API_KEY;
  }

  async sendSeen(chatId: string, messageId?: string): Promise<boolean> {
    if (!this.isEnabled) {
      this.logger.debug(`[MOCK] WAHA sendSeen for ${chatId}`);
      return true;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/sendSeen`, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify({
          session: this.session,
          chatId,
          messageId,
        }),
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch (err: any) {
      this.logger.warn(`WAHA sendSeen failed: ${err.message}`);
      return false;
    }
  }

  async startTyping(chatId: string): Promise<boolean> {
    if (!this.isEnabled) {
      return true;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/startTyping`, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify({
          session: this.session,
          chatId,
        }),
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async stopTyping(chatId: string): Promise<boolean> {
    if (!this.isEnabled) {
      return true;
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/stopTyping`, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify({
          session: this.session,
          chatId,
        }),
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async sendText(chatId: string, text: string): Promise<{ success: boolean; messageId?: string }> {
    // Zero-Stigma Invariant: Strip TBC/Tuberkulosis mention
    const cleanText = text.replace(/\b(TBC|Tuberkulosis)\b/gi, "").trim();

    if (!this.isEnabled) {
      this.logger.log(`[MOCK WAHA] Sent message to ${chatId}: "${cleanText}"`);
      return { success: true, messageId: `mock_msg_${Date.now()}` };
    }

    try {
      const res = await fetch(`${this.baseUrl}/api/sendText`, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify({
          session: this.session,
          chatId,
          text: cleanText,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (res.ok) {
        const data: any = await res.json();
        return { success: true, messageId: data.id };
      }
      return { success: false };
    } catch (err: any) {
      this.logger.warn(`WAHA sendText failed: ${err.message}`);
      return { success: false };
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["X-Api-Key"] = this.apiKey;
    }
    return headers;
  }
}
