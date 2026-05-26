const CATBOX_URL = "https://catbox.moe/user/api.php";

export async function uploadTemporaryImageUrl(
  imageBase64: string,
  mediaType: string,
): Promise<string | null> {
  const ext =
    mediaType === "image/jpeg"
      ? "jpg"
      : mediaType === "image/png"
        ? "png"
        : mediaType === "image/gif"
          ? "gif"
          : mediaType === "image/webp"
            ? "webp"
            : "jpg";

  const bytes = Buffer.from(imageBase64, "base64");
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append(
    "fileToUpload",
    new Blob([bytes], { type: mediaType }),
    `meme.${ext}`,
  );

  try {
    const res = await fetch(CATBOX_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const url = (await res.text()).trim();
    if (!url.startsWith("http")) return null;
    return url;
  } catch {
    return null;
  }
}
