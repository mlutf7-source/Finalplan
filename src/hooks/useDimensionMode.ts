import { useState, useCallback, useRef } from 'react';
import type { Point, Wall } from '../core/types';
import type { Dimension } from '../core/dimensionTypes';
import { findSnapToFace } from '../core/snapToFace';
import { distance } from '../core/geometry';
import { v4 as uuidv4 } from 'uuid';

const SNAP = 0.15;

interface DimState {
  active: boolean;
    start: Point | null;
      end: Point | null;
        wallId: string | null;
          faceSide: 1 | -1 | null;
          }

          export function useDimensionMode(walls: Wall[], onAdd: (d: Dimension) => void) {
            const [d, setD] = useState<DimState>({ active: false, start: null, end: null, wallId: null, faceSide: null });
              const ref = useRef(d);
                ref.current = d;

                  const begin = useCallback((pt: Point) => {
                      setD({ active: true, start: pt, end: pt, wallId: null, faceSide: null });
                        }, []);

                          const move = useCallback((pt: Point) => {
                              setD(prev => {
                                    if (!prev.active || !prev.start) return prev;

                                          // ✅ المنطق الجديد: الاعتماد على الفرق في الإحداثيات (dx, dy)
                                                const startPt = prev.start;
                                                      const dx = pt.x - startPt.x;
                                                            const dy = pt.y - startPt.y;

                                                                  // إذا كانت الحركة الأفقية أكبر بكثير من الرأسية، نثبت على الأفقي
                                                                        if (Math.abs(dx) > Math.abs(dy) * 1.5) {
                                                                                return { ...prev, end: { x: pt.x, y: startPt.y } }; // أفقي (y ثابت)
                                                                                      }

                                                                                            // إذا كانت الحركة الرأسية أكبر بكثير من الأفقية، نثبت على العمودي
                                                                                                  if (Math.abs(dy) > Math.abs(dx) * 1.5) {
                                                                                                          return { ...prev, end: { x: startPt.x, y: pt.y } }; // عمودي (x ثابت)
                                                                                                                }

                                                                                                                      // في باقي الحالات، نتبع حركة الإصبع بحرية
                                                                                                                            return { ...prev, end: pt };
                                                                                                                                });
                                                                                                                                  }, []);

                                                                                                                                    const finish = useCallback(() => {
                                                                                                                                        const cur = ref.current;
                                                                                                                                            if (!cur.active || !cur.start || !cur.end) { reset(); return; }
                                                                                                                                                if (distance(cur.start, cur.end) < 0.1) { reset(); return; }

                                                                                                                                                    let start = cur.start;
                                                                                                                                                        let end = cur.end;

                                                                                                                                                            const snapStart = findSnapToFace(start, walls, undefined, SNAP);
                                                                                                                                                                if (snapStart) start = snapStart.point;

                                                                                                                                                                    const snapEnd = findSnapToFace(end, walls, undefined, SNAP);
                                                                                                                                                                        if (snapEnd) end = snapEnd.point;

                                                                                                                                                                            onAdd({
                                                                                                                                                                                  id: uuidv4(),
                                                                                                                                                                                        start: { ...start },
                                                                                                                                                                                              end: { ...end },
                                                                                                                                                                                                    offset: 0.5,
                                                                                                                                                                                                        });
                                                                                                                                                                                                            reset();
                                                                                                                                                                                                              }, [onAdd, walls]);

                                                                                                                                                                                                                const reset = useCallback(() => setD({ active: false, start: null, end: null, wallId: null, faceSide: null }), []);

                                                                                                                                                                                                                  return {
                                                                                                                                                                                                                      isActive: d.active,
                                                                                                                                                                                                                          tempStart: d.start,
                                                                                                                                                                                                                              tempEnd: d.end,
                                                                                                                                                                                                                                  begin,
                                                                                                                                                                                                                                      move,
                                                                                                                                                                                                                                          finish,
                                                                                                                                                                                                                                              cancel: reset,
                                                                                                                                                                                                                                                };
                                                                                                                                                                                                                                                }