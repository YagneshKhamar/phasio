import https from "https";
import http from "http";

export async function validateApiKey(
  apiKey: string,
  baseUrl: string,
): Promise<void> {
  const url = new URL("/api-keys/validate", baseUrl);
  const body = JSON.stringify({ key: apiKey });

  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on("end", () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve();
          } else if (res.statusCode === 401) {
            reject(
              new Error(
                "Invalid or revoked Phasio API key. Get one at phasio.dev",
              ),
            );
          } else {
            reject(
              new Error(`Auth check failed (${res.statusCode ?? "unknown"})`),
            );
          }
        });
      },
    );

    req.on("error", (err: Error) => {
      console.warn(
        `\x1b[33mWarning: Could not reach Phasio auth server (${err.message}). Running in offline mode.\x1b[0m`,
      );
      resolve();
    });

    req.setTimeout(5000, () => {
      req.destroy();
      console.warn(
        "\x1b[33mWarning: Auth check timed out. Running in offline mode.\x1b[0m",
      );
      resolve();
    });

    req.write(body);
    req.end();
  });
}
