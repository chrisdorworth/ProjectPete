export interface ProxyConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export class ProxyRotator {
  private proxies: ProxyConfig[] = [];
  private currentIndex = 0;

  constructor() {
    const host = process.env["PROXY_HOST"];
    const port = process.env["PROXY_PORT"];
    const user = process.env["PROXY_USER"];
    const pass = process.env["PROXY_PASS"];

    if (host && port && user && pass) {
      // Residential proxy services typically support session-based rotation
      // by appending session IDs to the username
      for (let i = 0; i < 10; i++) {
        this.proxies.push({
          host,
          port: parseInt(port, 10),
          username: `${user}-session-${i}`,
          password: pass,
        });
      }
    }
  }

  getNext(): ProxyConfig | null {
    if (this.proxies.length === 0) return null;
    const proxy = this.proxies[this.currentIndex % this.proxies.length]!;
    this.currentIndex++;
    return proxy;
  }

  getProxyUrl(): string | null {
    const proxy = this.getNext();
    if (!proxy) return null;
    return `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`;
  }

  get isAvailable(): boolean {
    return this.proxies.length > 0;
  }

  get count(): number {
    return this.proxies.length;
  }
}

export const proxyRotator = new ProxyRotator();
