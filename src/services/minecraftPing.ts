import { MinecraftPingData } from '../types';

export async function pingMinecraftServer(host: string, port = 25565): Promise<MinecraftPingData> {
  const cleanHost = host.trim();
  const startTime = performance.now();

  // Try mcstatus.io first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    
    const query = port && port !== 25565 ? `${cleanHost}:${port}` : cleanHost;
    const res = await fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(query)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const latencyMs = Math.round(performance.now() - startTime);

      if (data.online) {
        const playerNames: string[] = [];
        if (Array.isArray(data.players?.list)) {
          data.players.list.forEach((p: { name_clean?: string; name_raw?: string } | string) => {
            if (typeof p === 'string') playerNames.push(p);
            else if (p.name_clean) playerNames.push(p.name_clean);
            else if (p.name_raw) playerNames.push(p.name_raw);
          });
        }

        return {
          online: true,
          host: cleanHost,
          port,
          version: data.version?.name_clean || data.version?.name_raw || '1.21.x',
          players: {
            online: data.players?.online ?? 0,
            max: data.players?.max ?? 20,
            list: playerNames,
          },
          motd: {
            clean: Array.isArray(data.motd?.clean) ? data.motd.clean : [data.motd?.clean || ''],
            html: Array.isArray(data.motd?.html) ? data.motd.html : [data.motd?.html || ''],
          },
          latencyMs,
          icon: data.icon,
        };
      }
    }
  } catch {
    // try fallback
  }

  // Fallback to mcsrvstat.us
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const query = port && port !== 25565 ? `${cleanHost}:${port}` : cleanHost;
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(query)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const latencyMs = Math.round(performance.now() - startTime);

      if (data.online) {
        const playerNames: string[] = [];
        if (Array.isArray(data.players?.list)) {
          data.players.list.forEach((p: { name?: string } | string) => {
            if (typeof p === 'string') playerNames.push(p);
            else if (p.name) playerNames.push(p.name);
          });
        }

        return {
          online: true,
          host: cleanHost,
          port,
          version: data.version || '1.21.x',
          players: {
            online: data.players?.online ?? 0,
            max: data.players?.max ?? 20,
            list: playerNames,
          },
          motd: {
            clean: Array.isArray(data.motd?.clean) ? data.motd.clean : [data.motd?.clean || ''],
            html: Array.isArray(data.motd?.html) ? data.motd.html : [data.motd?.html || ''],
          },
          latencyMs,
          icon: data.icon,
        };
      }
    }
  } catch {
    // offline or network error
  }

  return {
    online: false,
    host: cleanHost,
    port,
    players: {
      online: 0,
      max: 0,
      list: [],
    },
    error: 'Server is momenteel offline of onbereikbaar.',
  };
}

export function getPlayerHeadUrl(username: string, size = 32): string {
  const safeName = encodeURIComponent(username.trim() || 'Steve');
  return `https://mc-heads.net/avatar/${safeName}/${size}`;
}
