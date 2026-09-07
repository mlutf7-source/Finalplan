import type { Point, Wall, SnapResult } from './types';
import { distance, closestPointOnSegment, wallRectangle } from './geometry';

// عتبات منفصلة للزوايا والحواف
const CORNER_SNAP = 0.30; // 30 سم للزوايا
const FACE_SNAP = 0.05;   // 5 سم للحواف

export function findSnapToFace(
  pt: Point,
    walls: Wall[],
      excludeId?: string,
        threshold?: number,
        ): SnapResult | null {
          let bestCorner: SnapResult | null = null;
            let bestCornerDist = CORNER_SNAP;

              let bestFace: SnapResult | null = null;
                let bestFaceDist = threshold ?? FACE_SNAP;

                  for (const wall of walls) {
                      if (wall.id === excludeId) continue;

                          const rect = wallRectangle(wall);

                              // فحص الزوايا أولاً
                                  for (const corner of rect.corners) {
                                        const d = distance(pt, corner);
                                              if (d <= bestCornerDist) {
                                                      bestCornerDist = d;
                                                              bestCorner = {
                                                                        point: corner,
                                                                                  type: 'corner',
                                                                                            wallId: wall.id,
                                                                                                      distance: d,
                                                                                                              };
                                                                                                                    }
                                                                                                                        }

                                                                                                                            // فحص الوجهين بعتبة صغيرة جداً
                                                                                                                                for (const face of rect.faces) {
                                                                                                                                      const cp = closestPointOnSegment(pt, face.start, face.end);
                                                                                                                                            const d = distance(pt, cp);
                                                                                                                                                  if (d <= bestFaceDist) {
                                                                                                                                                          bestFaceDist = d;
                                                                                                                                                                  bestFace = {
                                                                                                                                                                            point: cp,
                                                                                                                                                                                      type: 'face',
                                                                                                                                                                                                wallId: wall.id,
                                                                                                                                                                                                          distance: d,
                                                                                                                                                                                                                  };
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                            }
                                                                                                                                                                                                                              }

                                                                                                                                                                                                                                if (bestCorner) return bestCorner;
                                                                                                                                                                                                                                  return bestFace;
                                                                                                                                                                                                                                  }