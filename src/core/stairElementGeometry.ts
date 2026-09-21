import type { Point, StairElement, Wall } from './types';
import { distance } from './geometry';

export function getElementCenter(el: StairElement): Point {
  return el.position;
}

// ✅ زوايا العنصر (4 زوايا)
export function getElementCorners(el: StairElement): Point[] {
  const halfW = el.width / 2;
  const halfL = el.length / 2;
  const cos = Math.cos(el.rotation);
  const sin = Math.sin(el.rotation);
  const local = [
    { x: -halfL, y: -halfW },
    { x: halfL, y: -halfW },
    { x: halfL, y: halfW },
    { x: -halfL, y: halfW },
  ];
  return local.map(p => ({
    x: el.position.x + p.x * cos - p.y * sin,
    y: el.position.y + p.x * sin + p.y * cos,
  }));
}

export function isPointInElement(pt: Point, el: StairElement): boolean {
  const corners = getElementCorners(el);
  let inside = false;
  for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
    const xi = corners[i].x, yi = corners[i].y;
    const xj = corners[j].x, yj = corners[j].y;
    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function moveElement(el: StairElement, dx: number, dy: number): StairElement {
  return { ...el, position: { x: el.position.x + dx, y: el.position.y + dy } };
}

export function rotateElement(el: StairElement, angle: number): StairElement {
  return { ...el, rotation: (el.rotation + angle) % (Math.PI * 2) };
}

// ✅ Snap شامل (خيار ج) — زوايا ↔ زوايا، زوايا ↔ حواف، حواف متوازية
export function snapElementToOthers(
  el: StairElement,
  others: StairElement[],
  tolerance: number = 0.2,
): StairElement {
  if (others.length === 0) return el;
  const corners = getElementCorners(el);
  const edges: { p: Point; q: Point }[] = corners.map((p, i) => ({
    p,
    q: corners[(i + 1) % corners.length],
  }));

  let bestDx = 0;
  let bestDy = 0;
  let bestDist = tolerance;

  for (const other of others) {
    if (other.id === el.id) continue;
    const otherCorners = getElementCorners(other);
    const otherEdges: { p: Point; q: Point }[] = otherCorners.map((p, i) => ({
      p,
      q: otherCorners[(i + 1) % otherCorners.length],
    }));

    // 1️⃣ زاوية ↔ زاوية
    for (const c1 of corners) {
      for (const c2 of otherCorners) {
        const d = distance(c1, c2);
        if (d < bestDist) {
          bestDist = d;
          bestDx = c2.x - c1.x;
          bestDy = c2.y - c1.y;
        }
      }
    }

    // 2️⃣ زاوية ↔ حافة
    for (const c1 of corners) {
      for (const edge of otherEdges) {
        const cp = closestPointOnSegmentLocal(c1, edge.p, edge.q);
        const d = distance(c1, cp);
        if (d < bestDist) {
          bestDist = d;
          bestDx = cp.x - c1.x;
          bestDy = cp.y - c1.y;
        }
      }
    }

    // 3️⃣ حافة ↔ زاوية
    for (const edge of edges) {
      for (const c2 of otherCorners) {
        const cp = closestPointOnSegmentLocal(c2, edge.p, edge.q);
        const d = distance(cp, c2);
        if (d < bestDist) {
          bestDist = d;
          bestDx = c2.x - cp.x;
          bestDy = c2.y - cp.y;
        }
      }
    }

    // 4️⃣ حافة ↔ حافة (توازي / استقامة) ✅ جديد
    for (const e1 of edges) {
      const dir1x = e1.q.x - e1.p.x;
      const dir1y = e1.q.y - e1.p.y;
      const len1 = Math.hypot(dir1x, dir1y);
      if (len1 < 1e-9) continue;
      const u1x = dir1x / len1;
      const u1y = dir1y / len1;

      for (const e2 of otherEdges) {
        const dir2x = e2.q.x - e2.p.x;
        const dir2y = e2.q.y - e2.p.y;
        const len2 = Math.hypot(dir2x, dir2y);
        if (len2 < 1e-9) continue;
        const u2x = dir2x / len2;
        const u2y = dir2y / len2;

        // فحص التوازي
        const cross = u1x * u2y - u1y * u2x;
        if (Math.abs(cross) > 0.1) continue;

        // المسافة العمودية من منتصف e1 إلى خط e2
        const midX = (e1.p.x + e1.q.x) / 2;
        const midY = (e1.p.y + e1.q.y) / 2;
        const nx = -u2y;
        const ny = u2x;
        const d = (midX - e2.p.x) * nx + (midY - e2.p.y) * ny;
        const absD = Math.abs(d);

        if (absD < bestDist && absD > 1e-6) {
          bestDist = absD;
          bestDx = -d * nx;
          bestDy = -d * ny;
        }
      }
    }
  }

  if (bestDist < tolerance) {
    return { ...el, position: { x: el.position.x + bestDx, y: el.position.y + bestDy } };
  }
  return el;
}

// ✅ Snap مع الجدران — أي زاوية من العنصر تلتصق بأي نقطة على أي جدار
export function snapElementToWalls(
  el: StairElement,
  walls: Wall[],
  tolerance: number = 0.15,
): StairElement {
  if (walls.length === 0) return el;
  const corners = getElementCorners(el);

  let bestDx = 0;
  let bestDy = 0;
  let bestDist = tolerance;

  for (const corner of corners) {
    for (const wall of walls) {
      const cp = closestPointOnSegmentLocal(corner, wall.start, wall.end);
      const d = distance(corner, cp);
      if (d < bestDist && d > 1e-6) {
        bestDist = d;
        bestDx = cp.x - corner.x;
        bestDy = cp.y - corner.y;
      }
    }
  }

  if (bestDist < tolerance) {
    return { ...el, position: { x: el.position.x + bestDx, y: el.position.y + bestDy } };
  }
  return el;
}

function closestPointOnSegmentLocal(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { ...a };
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * dx, y: a.y + t * dy };
}

export function getStepCount(el: StairElement): number {
  if (el.type !== 'step') return 0;
  const td = el.treadDepth ?? 0.27;
  return Math.max(2, Math.floor(el.length / td));
}
