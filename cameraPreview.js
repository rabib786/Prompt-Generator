/** @typedef {{shotType:string, lensType:string, aperture:string}} LensState */

/** @param {HTMLCanvasElement} canvas @param {LensState} lensState */
export function renderCameraPreview(canvas, lensState) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const deep = /f\/16|f\/8/i.test(lensState.aperture);
  const tele = /85mm|telephoto/i.test(lensState.lensType);
  const wide = /24mm|35mm|wide/i.test(lensState.lensType);

  drawBackground(ctx, w, h, deep);
  drawPerspective(ctx, w, h, tele, wide);
  drawSubject(ctx, w, h, lensState.shotType);
  drawLensBadge(ctx, lensState.lensType || "lens n/a", lensState.aperture || "aperture n/a", w);
}

function drawBackground(ctx, w, h, deep) {
  ctx.fillStyle = "#0f172f";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i += 1) {
    const x = 20 + i * 19;
    const y = 20 + (i % 2) * 17;
    const r = 6 + (i % 3) * 5;
    ctx.globalAlpha = deep ? 0.15 : 0.35;
    ctx.fillStyle = deep ? "#89a0ff" : "#d2b2ff";
    circle(ctx, x, y, r);
  }
  ctx.globalAlpha = 1;
}

function drawPerspective(ctx, w, h, tele, wide) {
  ctx.strokeStyle = "rgba(255,255,255,.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  const inset = tele ? 58 : wide ? 10 : 34;
  ctx.moveTo(inset, h);
  ctx.lineTo(w / 2, 14);
  ctx.lineTo(w - inset, h);
  ctx.stroke();
}

function drawSubject(ctx, w, h, shotType) {
  const shot = shotType.toLowerCase();
  let scale = 0.92;
  if (shot.includes("close-up")) scale = 1.35;
  if (shot.includes("medium")) scale = 1.05;
  if (shot.includes("full")) scale = 0.82;
  if (shot.includes("extreme wide")) scale = 0.52;

  const cx = w / 2;
  const baseY = h - 14;
  ctx.fillStyle = "#dfe7ff";
  circle(ctx, cx, baseY - 52 * scale, 9 * scale);
  roundRect(ctx, cx - 11 * scale, baseY - 44 * scale, 22 * scale, 34 * scale, 6 * scale);
  ctx.fill();
}

function drawLensBadge(ctx, lensText, apertureText, w) {
  ctx.fillStyle = "rgba(0,0,0,.55)";
  roundRect(ctx, 8, 8, w - 16, 28, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "10px Inter";
  ctx.fillText(lensText.slice(0, 24), 14, 19);
  ctx.fillStyle = "#8cfbe2";
  ctx.fillText(apertureText.slice(0, 24), 14, 31);
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
