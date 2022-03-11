import { getPeaks } from './getWaveformPeaks';

export function drawSampleDots(
  peaks: [number, number, number, number][],
  ctx: CanvasRenderingContext2D,
  radius: number,
) {
  peaks.forEach(([x1, avgMaxY]) => {
    ctx.beginPath();
    ctx.arc(x1, avgMaxY, radius, 0, 360);
    ctx.closePath();
    ctx.fill();
  });
}

export function drawPeaks(
  ctx: CanvasRenderingContext2D,
  peaks: [number, number, number, number][],
) {
  ctx.beginPath();
  peaks.forEach(([x1, _, minY, maxY]) => {
    ctx.moveTo(x1, minY);
    ctx.lineTo(x1, maxY);
  });
  ctx.closePath();
  ctx.stroke();
}

export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  peaks: [number, number, number, number][],
) {
  ctx.beginPath();
  ctx.strokeStyle = 'rgb(0,0,0)';

  for (let i = 0; i < peaks.length - 1; i++) {
    const [x1, y1] = peaks[i];
    const [x2, y2] = peaks[i + 1];

    const x_mid = (x1 + x2) / 2;
    const y_mid = (y1 + y2) / 2;
    const cp_x1 = (x_mid + x1) / 2;
    const cp_x2 = (x_mid + x2) / 2;

    ctx.quadraticCurveTo(cp_x1, y1, x_mid, y_mid);
    ctx.quadraticCurveTo(cp_x2, y2, x2, y2);
  }
  ctx.stroke();
}

export const drawWaveformWithPeaks = async ({
  startY,
  data,
  samplesPerPx,
  cacheKey,
  start,
  end,
  width,
  height,
  ctx,
}: {
  startY: number;
  data: Float32Array;
  samplesPerPx: number;
  cacheKey: string;
  start: number;
  end: number;
  width: number;
  height: number;
  ctx: CanvasRenderingContext2D;
}) => {
  const peaks = await getPeaks({
    data,
    samplesPerPx,
    cacheKey,
    start,
    end,
  });

  const scaledPeaks = peaks.map(
    ([min, max], i, peaks): [number, number, number, number] => {
      const x = (i / peaks.length) * width;

      const minY = startY + (min / 1024) * startY;
      const maxY = startY + (max / 1024) * startY;

      const absMaxY = Math.abs(min) > Math.abs(max) ? minY : maxY;

      return [x, absMaxY, minY, maxY];
    },
  );

  ctx.clearRect(0, 0, width, height);
  drawWaveform(ctx, scaledPeaks);

  const peaksOpacity =
    Math.min(1, Math.max(0, Math.log(samplesPerPx / 96)) - 0.5) + 0.5;

  ctx.strokeStyle = `rgba(0,0,0,${peaksOpacity})`;
  drawPeaks(ctx, scaledPeaks);

  if (samplesPerPx < 100 / width) {
    ctx.strokeStyle = 'rgb(0,0,0)';
    const radius = width / 256;
    drawSampleDots(scaledPeaks, ctx, radius);
  }
};
