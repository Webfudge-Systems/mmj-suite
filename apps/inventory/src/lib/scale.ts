"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseScaleLine } from "@webfudge/utils/scale";

/** The parts of the Web Serial API this file uses. Chrome and Edge on desktop support it. */
type SerialPortLike = {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
};
type SerialLike = { requestPort(): Promise<SerialPortLike> };

/**
 * Connects to a weighing scale on a USB or serial port and keeps the latest
 * reading. Most precision jewellery scales send a line per reading at 9600 baud;
 * the rate can be changed if a scale needs another one.
 */
export function useScale(baudRate = 9600) {
  const supported = typeof navigator !== "undefined" && "serial" in navigator;
  const [connected, setConnected] = useState(false);
  const [reading, setReading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const port = useRef<SerialPortLike | null>(null);
  const reader = useRef<ReadableStreamDefaultReader<string> | null>(null);

  const disconnect = useCallback(async () => {
    try {
      await reader.current?.cancel();
      await port.current?.close();
    } catch {
      // Already closed.
    }
    reader.current = null;
    port.current = null;
    setConnected(false);
  }, []);

  const connect = useCallback(async () => {
    if (!supported) {
      setError("This browser cannot talk to a scale. Use Chrome or Edge on the counter PC.");
      return;
    }
    try {
      const chosen = await (navigator as unknown as { serial: SerialLike }).serial.requestPort();
      await chosen.open({ baudRate });
      port.current = chosen;
      setConnected(true);
      setError(null);

      const stream = chosen.readable!.pipeThrough(new TextDecoderStream() as unknown as ReadableWritablePair<string, Uint8Array>);
      reader.current = stream.getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.current.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const grams = parseScaleLine(line);
          if (grams !== null) setReading(grams);
        }
      }
    } catch (cause) {
      const name = (cause as Error).name;
      if (name !== "NotFoundError") setError("The scale stopped responding. Check the cable and connect again.");
      await disconnect();
    }
  }, [supported, baudRate, disconnect]);

  useEffect(() => () => void disconnect(), [disconnect]);

  return { supported, connected, reading, error, connect, disconnect };
}
