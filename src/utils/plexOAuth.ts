type PlexPinResponse = {
  id: number;
  code: string;
  authToken: string | null;
};

type PlexHeaders = Record<string, string>;

const PLEX_API_BASE = "https://plex.tv/api/v2";
const CLIENT_ID_KEY = "tunearr-plex-client-id";
const PRODUCT_NAME = "Tunearr";
const POLL_INTERVAL_MS = 1000;

function generateUUID(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return [...bytes]
    .map((b, i) =>
      [4, 6, 8, 10].includes(i)
        ? `-${b.toString(16).padStart(2, "0")}`
        : b.toString(16).padStart(2, "0")
    )
    .join("");
}

function getClientId(): string {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = generateUUID();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
}

function getPlexHeaders(): PlexHeaders {
  return {
    Accept: "application/json",
    "X-Plex-Product": PRODUCT_NAME,
    "X-Plex-Version": "1.0.0",
    "X-Plex-Client-Identifier": getClientId(),
    "X-Plex-Platform": navigator.userAgent.includes("Mac")
      ? "macOS"
      : navigator.userAgent.includes("Win")
        ? "Windows"
        : "Linux",
  };
}

async function getPin(): Promise<PlexPinResponse> {
  const res = await fetch(`${PLEX_API_BASE}/pins?strong=true`, {
    method: "POST",
    headers: getPlexHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to create Plex PIN: ${res.status}`);
  return res.json();
}

function openPopup(code: string): Window | null {
  const url = `https://app.plex.tv/auth/#!?clientID=${encodeURIComponent(getClientId())}&code=${encodeURIComponent(code)}&context%5Bdevice%5D%5Bproduct%5D=${encodeURIComponent(PRODUCT_NAME)}`;
  const width = 800;
  const height = 700;
  const left = window.screenX + (window.innerWidth - width) / 2;
  const top = window.screenY + (window.innerHeight - height) / 2;
  return window.open(
    url,
    "PlexAuth",
    `width=${width},height=${height},left=${left},top=${top}`
  );
}

function pollForToken(
  pinId: number,
  popup: Window | null
): Promise<string | null> {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      if (popup?.closed) {
        clearInterval(interval);
        resolve(null);
        return;
      }

      try {
        const res = await fetch(`${PLEX_API_BASE}/pins/${pinId}`, {
          headers: getPlexHeaders(),
        });
        if (!res.ok) {
          clearInterval(interval);
          resolve(null);
          return;
        }

        const data: PlexPinResponse = await res.json();
        if (data.authToken) {
          clearInterval(interval);
          popup?.close();
          resolve(data.authToken);
        }
      } catch {
        clearInterval(interval);
        resolve(null);
      }
    }, POLL_INTERVAL_MS);
  });
}

export async function login(): Promise<string | null> {
  const pin = await getPin();
  const popup = openPopup(pin.code);
  return pollForToken(pin.id, popup);
}
