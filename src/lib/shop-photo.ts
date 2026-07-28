export const SHOP_PHOTO_ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const SHOP_PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";

export const SHOP_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

export type ShopPhotoSelection = {
  previewUrl: string;
  base64: string;
  contentType: string;
  fileName: string;
};

export function validateShopPhotoFile(file: File): string | null {
  if (!SHOP_PHOTO_ALLOWED_TYPES.has(file.type)) {
    return "Use a JPEG, PNG, or WebP image.";
  }
  if (file.size > SHOP_PHOTO_MAX_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

export function readShopPhotoFile(file: File): Promise<ShopPhotoSelection> {
  const validationError = validateShopPhotoFile(file);
  if (validationError) {
    return Promise.reject(new Error(validationError));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const match = /^data:([^;]+);base64,(.+)$/.exec(result);
      if (!match) {
        reject(new Error("Could not read image"));
        return;
      }
      resolve({
        previewUrl: result,
        contentType: match[1],
        base64: match[2],
        fileName: file.name,
      });
    };
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}

export function revokeShopPhotoPreview(selection: ShopPhotoSelection | null) {
  if (!selection?.previewUrl.startsWith("blob:")) return;
  URL.revokeObjectURL(selection.previewUrl);
}
