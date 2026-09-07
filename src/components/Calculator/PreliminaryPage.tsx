import React, { useState } from 'react';
import { PreliminaryInputs } from './PreliminaryInputs';
import { PreliminaryTables } from './PreliminaryTables';
import type { Wall } from '../../core/types';
import { distance } from '../../core/geometry';

interface Props {
  walls: Wall[];
  }

  interface PreliminaryResults {
    buildingArea: number;
      excavationVolume: number;
        backfillVolume: number;
          plinthArea: number;
          }

          export const PreliminaryPage: React.FC<Props> = ({ walls }) => {
            // ✅ القيم الافتراضية الجديدة
              const [excavationDepth, setExcavationDepth] = useState(1.5);
                const [backfillDepth, setBackfillDepth] = useState(2);
                  const [plinthHeight, setPlinthHeight] = useState(2.5);
                    const [prelimResults, setPrelimResults] = useState<PreliminaryResults | null>(null);

                      const calculate = () => {
                          const extWalls = walls.filter(w => w.type === 'exterior');
                              let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                                  extWalls.forEach(w => {
                                        minX = Math.min(minX, w.start.x, w.end.x);
                                              maxX = Math.max(maxX, w.start.x, w.end.x);
                                                    minY = Math.min(minY, w.start.y, w.end.y);
                                                          maxY = Math.max(maxY, w.start.y, w.end.y);
                                                              });
                                                                  const buildingArea = Math.max(0, (maxX - minX) * (maxY - minY));

                                                                      const exteriorWallsLength = extWalls.reduce((s, w) => s + distance(w.start, w.end), 0);

                                                                          const excavationVolume = buildingArea * excavationDepth;
                                                                              const backfillVolume = buildingArea * backfillDepth;
                                                                                  const plinthArea = exteriorWallsLength * plinthHeight;

                                                                                      const newResults: PreliminaryResults = { buildingArea, excavationVolume, backfillVolume, plinthArea };

                                                                                          setPrelimResults(newResults);
                                                                                              localStorage.setItem('preliminary_results', JSON.stringify(newResults));
                                                                                                };

                                                                                                  return (
                                                                                                      <div style={{ padding: 12 }}>
                                                                                                            <PreliminaryInputs
                                                                                                                    excavationDepth={excavationDepth}
                                                                                                                            backfillDepth={backfillDepth}
                                                                                                                                    plinthHeight={plinthHeight}
                                                                                                                                            onExcavationDepthChange={setExcavationDepth}
                                                                                                                                                    onBackfillDepthChange={setBackfillDepth}
                                                                                                                                                            onPlinthHeightChange={setPlinthHeight}
                                                                                                                                                                    onCalculate={calculate}
                                                                                                                                                                          />

                                                                                                                                                                                {prelimResults && (
                                                                                                                                                                                        <PreliminaryTables results={prelimResults} />
                                                                                                                                                                                              )}
                                                                                                                                                                                                  </div>
                                                                                                                                                                                                    );
                                                                                                                                                                                                    };