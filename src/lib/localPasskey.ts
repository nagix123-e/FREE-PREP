function bytesToBase64Url(bytes: ArrayBuffer): string {
  const values = new Uint8Array(bytes);
  let binary = "";
  values.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const values = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return values.buffer;
}

function makeChallenge(): ArrayBuffer {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytes.buffer as ArrayBuffer;
}

export function isDevicePasskeyAvailable(): boolean {
  return Boolean(window.isSecureContext && window.PublicKeyCredential && navigator.credentials?.create);
}

export async function createEditingPasskey(setName: string): Promise<string> {
  if (!isDevicePasskeyAvailable()) {
    throw new Error("Device passkeys are not available in this app runtime. Use the edit password instead.");
  }

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: makeChallenge(),
      rp: { name: "FREE PREP" },
      user: {
        id: makeChallenge(),
        name: `free-prep-${Date.now()}`,
        displayName: setName.slice(0, 64) || "Question set editor"
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 }
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required"
      },
      timeout: 60_000,
      attestation: "none"
    }
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error("No device passkey was created.");
  return bytesToBase64Url(credential.rawId);
}

export async function verifyEditingPasskey(credentialId: string): Promise<boolean> {
  if (!isDevicePasskeyAvailable()) {
    throw new Error("Device passkeys are not available in this app runtime. Use the edit password instead.");
  }

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: makeChallenge(),
      allowCredentials: [{ type: "public-key", id: base64UrlToBytes(credentialId) }],
      userVerification: "required",
      timeout: 60_000
    }
  })) as PublicKeyCredential | null;

  return Boolean(assertion && bytesToBase64Url(assertion.rawId) === credentialId);
}
