const MAX_MESSAGE_BYTES = 1024 * 1024;

export function encodeFrame(value: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(value), "utf8");
  if (body.length > MAX_MESSAGE_BYTES) {
    throw new Error("消息超过 1 MiB 限制");
  }
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32LE(body.length, 0);
  return Buffer.concat([header, body]);
}

export class FrameDecoder {
  private pending = Buffer.alloc(0);

  push(chunk: Buffer): unknown[] {
    this.pending = Buffer.concat([this.pending, chunk]);
    const messages: unknown[] = [];
    while (this.pending.length >= 4) {
      const length = this.pending.readUInt32LE(0);
      if (length > MAX_MESSAGE_BYTES) {
        throw new Error("收到的消息超过 1 MiB 限制");
      }
      if (this.pending.length < length + 4) break;
      const body = this.pending.subarray(4, length + 4);
      messages.push(JSON.parse(body.toString("utf8")) as unknown);
      this.pending = this.pending.subarray(length + 4);
    }
    return messages;
  }
}
