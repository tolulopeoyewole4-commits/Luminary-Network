/**
 * Copy text to the system clipboard.
 * Prefers `navigator.clipboard`; falls back to a temporary textarea.
 */
export async function copyTextToClipboard(text: string): Promise<void> {
  const value = text ?? "";
  if (typeof window === "undefined") {
    throw new Error("Clipboard is only available in the browser.");
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const succeeded = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!succeeded) {
    throw new Error("Unable to copy to the clipboard.");
  }
}
