import type { Wall, Column, Window, Door, CalculationResults } from './types';
import { distance } from './geometry';

export const wallLength = (w: Wall): number => distance(w.start, w.end);

export const wallArea = (w: Wall, height: number): number => wallLength(w) * height;

export const columnArea = (c: Column, height: number): number =>
  2 * (c.width + c.length) * height;

  export const windowArea = (w: Window): number => w.width * w.height;

  export const doorArea = (d: Door): number => d.width * d.height;

  export const netWallArea = (
    wall: Wall,
      height: number,
        windows: Window[],
          doors: Door[],
          ): number => {
            const gross = wallArea(wall, height);
              const openings = [...windows, ...doors]
                  .filter(o => o.wallId === wall.id)
                      .reduce((sum, o) => sum + ('height' in o ? o.width * o.height : 0), 0);
                        return Math.max(0, gross - openings);
                        };

                        export const calculateResults = (
                          walls: Wall[],
                            columns: Column[],
                              windows: Window[],
                                doors: Door[],
                                  buildingHeight: number,
                                  ): CalculationResults => {
                                    const ext = walls.filter(w => w.type === 'exterior');
                                      const int = walls.filter(w => w.type === 'interior');

                                        const extLen = ext.reduce((s, w) => s + wallLength(w), 0);
                                          const intLen = int.reduce((s, w) => s + wallLength(w), 0);
                                            const extArea = ext.reduce((s, w) => s + wallArea(w, buildingHeight), 0);
                                              const intArea = int.reduce((s, w) => s + wallArea(w, buildingHeight), 0);
                                                const colsArea = columns.reduce((s, c) => s + columnArea(c, buildingHeight), 0);
                                                  const winsArea = windows.reduce((s, w) => s + windowArea(w), 0);
                                                    const dorsArea = doors.reduce((s, d) => s + doorArea(d), 0);
                                                      const netExt = ext.reduce((s, w) => s + netWallArea(w, buildingHeight, windows, doors), 0);
                                                        const netInt = int.reduce((s, w) => s + netWallArea(w, buildingHeight, windows, doors), 0);

                                                          let buildingArea = 0;
                                                            if (ext.length >= 4) {
                                                                const xs = ext.flatMap(w => [w.start.x, w.end.x]);
                                                                    const ys = ext.flatMap(w => [w.start.y, w.end.y]);
                                                                        buildingArea = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
                                                                          }

                                                                            return {
                                                                                buildingArea,
                                                                                    exteriorWallsLength: extLen,
                                                                                        interiorWallsLength: intLen,
                                                                                            exteriorWallsArea: extArea,
                                                                                                interiorWallsArea: intArea,
                                                                                                    columnsArea: colsArea,
                                                                                                        windowsArea: winsArea,
                                                                                                            doorsArea: dorsArea,
                                                                                                                netExteriorWallsArea: netExt,
                                                                                                                    netInteriorWallsArea: netInt,
                                                                                                                      };
                                                                                                                      };