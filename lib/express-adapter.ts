import type { NextRequest } from "next/server";
import { Readable } from "node:stream";
import type { Express } from "express";

type HeaderValue = number | string | readonly string[];

/**
 * Forward a Next.js App Router request into an Express app and return a Web Response.
 * Used so MoodSync can stay on the App Router without the Pages API.
 */
export async function forwardToExpress(
  app: Express,
  req: NextRequest,
): Promise<Response> {
  const url = new URL(req.url);
  const pathWithQuery = url.pathname + url.search;
  const method = req.method.toUpperCase();
  const bodyBuffer =
    method === "GET" || method === "HEAD"
      ? undefined
      : Buffer.from(await req.arrayBuffer());

  const headerMap: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headerMap[key] = value;
  });

  return new Promise<Response>((resolve, reject) => {
    const requestStream = new Readable({
      read() {
        /* noop */
      },
    }) as Readable & {
      method: string;
      url: string;
      originalUrl: string;
      headers: Record<string, string>;
      connection: { remoteAddress: string };
      socket: { remoteAddress: string };
      ip: string;
    };

    requestStream.method = method;
    requestStream.url = pathWithQuery;
    requestStream.originalUrl = pathWithQuery;
    requestStream.headers = headerMap;
    requestStream.connection = { remoteAddress: "127.0.0.1" };
    requestStream.socket = { remoteAddress: "127.0.0.1" };
    requestStream.ip = "127.0.0.1";

    if (bodyBuffer && bodyBuffer.length > 0) {
      requestStream.push(bodyBuffer);
    }
    requestStream.push(null);

    const chunks: Buffer[] = [];
    let statusCode = 200;
    const responseHeaders: Record<string, HeaderValue> = {};
    let ended = false;

    const finish = () => {
      if (ended) return;
      ended = true;
      const headers = new Headers();
      for (const [key, value] of Object.entries(responseHeaders)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) {
          for (const item of value) headers.append(key, String(item));
        } else {
          headers.set(key, String(value));
        }
      }
      resolve(
        new Response(Buffer.concat(chunks), {
          status: statusCode,
          headers,
        }),
      );
    };

    const fakeRes = {
      statusCode: 200,
      headersSent: false,
      writableEnded: false,
      setHeader(name: string, value: HeaderValue) {
        responseHeaders[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name: string) {
        return responseHeaders[name.toLowerCase()];
      },
      getHeaders() {
        return { ...responseHeaders };
      },
      removeHeader(name: string) {
        delete responseHeaders[name.toLowerCase()];
      },
      writeHead(
        code: number,
        reasonOrHeaders?: string | Record<string, HeaderValue>,
        maybeHeaders?: Record<string, HeaderValue>,
      ) {
        statusCode = code;
        this.statusCode = code;
        const hdrs =
          typeof reasonOrHeaders === "object"
            ? reasonOrHeaders
            : maybeHeaders;
        if (hdrs) {
          for (const [k, v] of Object.entries(hdrs)) {
            this.setHeader(k, v);
          }
        }
        this.headersSent = true;
        return this;
      },
      write(
        chunk: string | Buffer,
        encodingOrCb?: BufferEncoding | (() => void),
        cb?: () => void,
      ) {
        const buf = Buffer.isBuffer(chunk)
          ? chunk
          : Buffer.from(
              chunk,
              typeof encodingOrCb === "string" ? encodingOrCb : "utf8",
            );
        chunks.push(buf);
        if (typeof encodingOrCb === "function") encodingOrCb();
        if (typeof cb === "function") cb();
        return true;
      },
      end(
        chunk?: string | Buffer | (() => void),
        encodingOrCb?: BufferEncoding | (() => void),
        cb?: () => void,
      ) {
        if (typeof chunk === "function") {
          chunk();
          this.writableEnded = true;
          finish();
          return this;
        }
        if (chunk) {
          this.write(
            chunk,
            typeof encodingOrCb === "string" ? encodingOrCb : undefined,
          );
        }
        if (typeof encodingOrCb === "function") encodingOrCb();
        if (typeof cb === "function") cb();
        statusCode = this.statusCode;
        this.writableEnded = true;
        this.headersSent = true;
        finish();
        return this;
      },
      on() {
        return this;
      },
      once() {
        return this;
      },
      emit() {
        return false;
      },
      removeListener() {
        return this;
      },
      pipe() {
        return this;
      },
      cork() {},
      uncork() {},
      flushHeaders() {
        this.headersSent = true;
      },
    };

    try {
      app(requestStream as never, fakeRes as never, (err?: unknown) => {
        if (err) reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}
