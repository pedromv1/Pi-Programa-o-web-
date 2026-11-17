// Fallbacks em canvas mantêm os gráficos informativos caso a CDN do Chart.js esteja indisponível.
function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(220, Math.round(rect.width || 320));
  const height = Math.max(150, Math.round(rect.height || 180));
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.font = '9px DM Sans, sans-serif';
  context.textBaseline = 'middle';
  return { context, width, height };
}

function compactMoney(value) {
  const absolute = Math.abs(value);
  if (absolute >= 1000) return `R$${(value / 1000).toFixed(1)}k`;
  return `R$${Math.round(value)}`;
}

export function drawFallbackBar(canvas, labels, datasets) {
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const left = 42, right = 8, top = 9, bottom = 28;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxValue = Math.max(100, ...datasets.flatMap(item => item.data), 0) * 1.12;
  ctx.strokeStyle = '#eef2ef';
  ctx.fillStyle = '#a2ada6';
  ctx.lineWidth = 1;
  for (let index = 0; index <= 4; index += 1) {
    const y = top + plotHeight * index / 4;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke();
    ctx.textAlign = 'right';
    ctx.fillText(compactMoney(maxValue * (4 - index) / 4), left - 6, y);
  }
  const groupWidth = plotWidth / Math.max(labels.length, 1);
  const barWidth = Math.min(15, groupWidth / (datasets.length + 1));
  labels.forEach((label, index) => {
    datasets.forEach((dataset, datasetIndex) => {
      const value = Number(dataset.data[index]) || 0;
      const barHeight = value / maxValue * plotHeight;
      const x = left + groupWidth * index + groupWidth / 2 + (datasetIndex - (datasets.length - 1) / 2) * (barWidth + 2) - barWidth / 2;
      ctx.fillStyle = dataset.color;
      ctx.beginPath();
      ctx.roundRect(x, top + plotHeight - barHeight, barWidth, Math.max(barHeight, 1), 3);
      ctx.fill();
    });
    ctx.fillStyle = '#9aa69f';
    ctx.textAlign = 'center';
    ctx.fillText(label, left + groupWidth * index + groupWidth / 2, height - 11);
  });
}

export function drawFallbackDonut(canvas, values, colors) {
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const total = values.reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * .34;
  const lineWidth = Math.max(15, Math.min(23, radius * .27));
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'butt';
  if (!total) {
    ctx.beginPath(); ctx.strokeStyle = '#edf2ef'; ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.stroke();
    return;
  }
  let angle = -Math.PI / 2;
  values.forEach((value, index) => {
    const share = Math.max(0, Number(value) || 0) / total;
    if (!share) return;
    ctx.beginPath();
    ctx.strokeStyle = colors[index] || '#9ba69f';
    ctx.arc(centerX, centerY, radius, angle, angle + share * Math.PI * 2);
    ctx.stroke();
    angle += share * Math.PI * 2;
  });
}

export function drawFallbackLine(canvas, labels, values) {
  const { context: ctx, width, height } = prepareCanvas(canvas);
  const left = 43, right = 10, top = 12, bottom = 29;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values);
  const spread = Math.max(100, maxValue - minValue);
  const low = minValue - spread * .12;
  const high = maxValue + spread * .12;
  const toY = value => top + (high - value) / (high - low) * plotHeight;
  ctx.strokeStyle = '#eef2ef';
  ctx.fillStyle = '#a2ada6';
  for (let index = 0; index <= 4; index += 1) {
    const value = high - (high - low) * index / 4;
    const y = top + plotHeight * index / 4;
    ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke();
    ctx.textAlign = 'right'; ctx.fillText(compactMoney(value), left - 6, y);
  }
  const points = values.map((value, index) => ({
    x: left + (labels.length <= 1 ? plotWidth / 2 : plotWidth * index / (labels.length - 1)),
    y: toY(value)
  }));
  if (points.length) {
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.strokeStyle = '#26986a'; ctx.lineWidth = 2; ctx.stroke();
    points.forEach(point => { ctx.beginPath(); ctx.fillStyle = '#26986a'; ctx.arc(point.x, point.y, 3, 0, Math.PI * 2); ctx.fill(); });
  }
  labels.forEach((label, index) => {
    const x = left + (labels.length <= 1 ? plotWidth / 2 : plotWidth * index / (labels.length - 1));
    ctx.fillStyle = '#9aa69f'; ctx.textAlign = 'center'; ctx.fillText(label, x, height - 11);
  });
}
