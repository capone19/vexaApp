export async function downloadImage(url: string, filename: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch {
    window.open(url, '_blank');
  }
}

export async function downloadAllImages(
  items: { url: string; filename: string }[],
  delayMs = 400,
) {
  for (let i = 0; i < items.length; i++) {
    await downloadImage(items[i].url, items[i].filename);
    if (i < items.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}
