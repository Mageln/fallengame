// Определение видимой (непрозрачной) части иконки.
// Нужно потому, что картинки приходят с разными пропорциями и прозрачными полями,
// из-за чего в одинаковом слоте они выглядят разного размера.

export interface IconBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Результат считается один раз на картинку и переиспользуется
const boundsCache = new WeakMap<HTMLImageElement, IconBounds>();

export const getVisibleBounds = (img: HTMLImageElement): IconBounds => {
  const cached = boundsCache.get(img);
  if (cached) return cached;

  const full: IconBounds = { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };

  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      boundsCache.set(img, full);
      return full;
    }

    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        // Альфа выше порога — считаем пиксель видимым
        if (data[(y * canvas.width + x) * 4 + 3] > 16) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const result: IconBounds = maxX < 0
      ? full
      : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };

    boundsCache.set(img, result);
    return result;
  } catch {
    // Изображение из другого origin — canvas недоступен для чтения
    boundsCache.set(img, full);
    return full;
  }
};
