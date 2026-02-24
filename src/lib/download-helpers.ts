export async function downloadFile(url: string, filename: string) {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error("Kunne ikke hente fil");
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename || "fil";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}
