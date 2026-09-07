import type { Wall } from '../../core/types';

const n = (v: any) => { const num = parseFloat(v); return isNaN(num) ? 0 : num; };

const G = (k: string) => { try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : null; } catch (e) { return null; } };

export const getSummaryData = (walls: Wall[]) => {
  // حساب مساحة المبنى تلقائياً من المسقط
    const extWalls = walls.filter(w => w.type === 'exterior');
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        extWalls.forEach(w => {
            minX = Math.min(minX, w.start.x, w.end.x);
                maxX = Math.max(maxX, w.start.x, w.end.x);
                    minY = Math.min(minY, w.start.y, w.end.y);
                        maxY = Math.max(maxY, w.start.y, w.end.y);
                          });
                            const buildingArea = Math.max(0, (maxX - minX) * (maxY - minY));

                              // قراءة النتائج من localStorage
                                const prelim = G('preliminary_results') || {};
                                  const struct = G('structure_results') || {};
                                    const finishes = G('finishes_results') || {};
                                      const prices = G('prices_v2') || {};

                                        return { buildingArea, prelim, struct, finishes, prices };
                                        };

                                    