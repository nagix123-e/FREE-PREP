import { checkStatus, getData, hasData, removeData, setData } from "@choochmeque/tauri-plugin-biometry-api";

const EDIT_PASSKEY_DOMAIN = "com.satpracticesimulator.app.edit-passkeys";
const EDIT_PASSKEY_PREFIX = "native:";

export type NativePasskeyStatus = {
  available: boolean;
  message: string;
};

export async function getNativePasskeyStatus(): Promise<NativePasskeyStatus> {
  try {
    const status = await checkStatus();
    return {
      available: status.isAvailable,
      message: status.isAvailable ? "" : status.error || "Device authentication is not available."
    };
  } catch {
    return {
      available: false,
      message: "Device authentication is available only in the FREE PREP desktop app."
    };
  }
}

export function isNativePasskeyCredentialId(value: string): boolean {
  return value.startsWith(EDIT_PASSKEY_PREFIX);
}

export async function createNativeEditingPasskey(questionSetId: number): Promise<string> {
  const name = editPasskeyName(questionSetId);
  await setData({
    domain: EDIT_PASSKEY_DOMAIN,
    name,
    data: crypto.randomUUID()
  });
  return `${EDIT_PASSKEY_PREFIX}${name}`;
}

export async function verifyNativeEditingPasskey(credentialId: string, setName: string): Promise<boolean> {
  const name = nativePasskeyName(credentialId);
  if (!name || !(await hasData({ domain: EDIT_PASSKEY_DOMAIN, name }))) {
    return false;
  }

  const response = await getData({
    domain: EDIT_PASSKEY_DOMAIN,
    name,
    reason: `Unlock ${setName} for editing in FREE PREP`,
    cancelTitle: "Cancel"
  });
  return Boolean(response.data);
}

export async function removeNativeEditingPasskey(credentialId: string): Promise<void> {
  const name = nativePasskeyName(credentialId);
  if (name) {
    await removeData({ domain: EDIT_PASSKEY_DOMAIN, name });
  }
}

function editPasskeyName(questionSetId: number): string {
  return `question-set-${questionSetId}`;
}

function nativePasskeyName(credentialId: string): string | null {
  if (!isNativePasskeyCredentialId(credentialId)) return null;
  const name = credentialId.slice(EDIT_PASSKEY_PREFIX.length);
  return name || null;
}
