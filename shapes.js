// Mascot shapes — vector "clouds" made of circles: the body is circles of one fill, the eyes are white ovals.
// viewBox 0 0 100 100; eyes — the eye centers. To change the shape, edit only this file.
const ring = (cx, cy, dist, r, n, start = -90) => Array.from({ length: n }, (_, i) => {
  const a = ((start + (360 / n) * i) * Math.PI) / 180;
  return [cx + dist * Math.cos(a), cy + dist * Math.sin(a), r];
});

export const SHAPES = {
  // A — an asymmetric cloud: petals of different sizes
  cloud: { circles: [[50, 54, 27], [31, 52, 18], [49, 30, 20], [70, 39, 17], [68, 66, 19], [40, 73, 18], [57, 76, 15]],
           eyes: [[45, 46], [61, 46]] },
  // B — a flower: five even petals around the center
  flower: { circles: [[50, 55, 25], ...ring(50, 55, 23, 19, 5)], eyes: [[44, 52], [57, 52]] },
  // C — a fuzzy circle: the body and small "fur" along the edge
  fuzzy: { circles: [[50, 52, 33], ...ring(50, 52, 33, 8.5, 16)], eyes: [[44, 50], [57, 50]] },
};
