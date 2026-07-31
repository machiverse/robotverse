// Minimal implicit-TLS SMTP client (port 465).
// denomailer's TLS loop burns the edge CPU budget, so we speak SMTP directly.

const enc = new TextEncoder();
const dec = new TextDecoder();

export class SimpleSMTP {
  private conn: Deno.TlsConn | null = null;
  private buf = "";

  constructor(
    private opts: { hostname: string; port: number; username: string; password: string },
  ) {}

  private async readReply(): Promise<string> {
    const chunk = new Uint8Array(4096);
    // Read until we get a final reply line ("250 ..." with space, not dash)
    while (true) {
      const lines = this.buf.split("\r\n").filter(Boolean);
      const last = lines[lines.length - 1];
      if (last && /^\d{3} /.test(last)) {
        const out = this.buf;
        this.buf = "";
        return out;
      }
      const n = await this.conn!.read(chunk);
      if (n === null) throw new Error("SMTP connection closed");
      this.buf += dec.decode(chunk.subarray(0, n));
    }
  }

  private async cmd(line: string, expect = 2): Promise<string> {
    await this.conn!.write(enc.encode(line + "\r\n"));
    const reply = await this.readReply();
    const code = Number(reply.trim().slice(-reply.trim().length).match(/(\d{3}) [^\r\n]*$/)?.[1] ?? 0);
    if (Math.floor(code / 100) !== expect) {
      throw new Error(`SMTP error for "${line.split(" ")[0]}": ${reply.trim()}`);
    }
    return reply;
  }

  async connect() {
    this.conn = await Deno.connectTls({ hostname: this.opts.hostname, port: this.opts.port });
    await this.readReply(); // greeting
    await this.cmd(`EHLO robotverse.in`);
    await this.cmd("AUTH LOGIN", 3);
    await this.cmd(btoa(this.opts.username), 3);
    await this.cmd(btoa(this.opts.password));
  }

  async send(msg: { from: string; fromEmail: string; to: string; subject: string; html: string }) {
    await this.cmd(`MAIL FROM:<${msg.fromEmail}>`);
    await this.cmd(`RCPT TO:<${msg.to}>`);
    await this.cmd("DATA", 3);
    const body = [
      `From: ${msg.from}`,
      `To: <${msg.to}>`,
      `Subject: ${msg.subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      "",
      msg.html.replace(/\r?\n\./g, "\n.."),
      ".",
    ].join("\r\n");
    await this.conn!.write(enc.encode(body + "\r\n"));
    const reply = await this.readReply();
    if (!/^2/.test(reply.trim().match(/(\d{3}) [^\r\n]*$/)?.[1] ?? "")) {
      throw new Error(`SMTP DATA rejected: ${reply.trim()}`);
    }
  }

  async close() {
    try {
      await this.cmd("QUIT", 2);
    } catch (_) { /* ignore */ }
    try {
      this.conn?.close();
    } catch (_) { /* ignore */ }
    this.conn = null;
  }
}
