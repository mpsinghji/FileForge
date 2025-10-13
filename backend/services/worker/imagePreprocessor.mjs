import { parentPort, workerData, isMainThread } from 'worker_threads';
import sharp from 'sharp';
import fs from 'fs';

async function preprocess(inputPath, outputPath) {
  const imageInfo = await sharp(inputPath).metadata();
  let img = sharp(inputPath).grayscale().linear(1.2, -0.1).normalize().sharpen({ sigma: 1, flat: 1, jagged: 2 }).median(1);
  if (imageInfo.width > 3000 || imageInfo.height > 3000) {
    img = img.resize(3000, 3000, { fit: 'inside', withoutEnlargement: true });
  }
  await img.png().toFile(outputPath);
  return outputPath;
}

if (!isMainThread) {
  const { inputPath, outputPath } = workerData;
  preprocess(inputPath, outputPath)
    .then((p) => parentPort.postMessage({ ok: true, path: p }))
    .catch((e) => parentPort.postMessage({ ok: false, error: e.message }));
}


