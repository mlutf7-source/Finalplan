import React, { useState } from 'react';
import { calculateFinishes, type FinishesInput, type FinishResults } from '../../core/finishCalculations';
import type { Wall, Column, Window, Door } from '../../core/types';
import type { RoomRegion } from '../../core/regionTypes';
import { FinishInputs } from './FinishInputs';
import { FinishTables } from './FinishTables';

interface Props {
  walls: Wall[];
  columns: Column[];
  windows: Window[];
  doors: Door[];
  regions: RoomRegion[];
}

export const FinishesPage: React.FC<Props> = ({ walls, columns, windows, doors, regions }) => {
  const [floorHeight, setFloorHeight] = useState(3);
  const [hasMarble, setHasMarble] = useState<boolean>(false);
  const [results, setResults] = useState<FinishResults | null>(null);
  const [electricalPts, setElectricalPts] = useState(0);
  const [plumbingPts, setPlumbingPts] = useState(0);

  const calculate = () => {
    const input: FinishesInput = { floorHeight, hasMarble };
    const res = calculateFinishes(walls, columns, windows, doors, regions, input);

    const roundedRes = { ...res };
    roundedRes.exteriorBlocks = Math.ceil(res.exteriorBlocks);
    roundedRes.interiorBlocks = Math.ceil(res.interiorBlocks);
    roundedRes.exteriorBlockCement = Math.ceil(res.exteriorBlockCement);
    roundedRes.interiorBlockCement = Math.ceil(res.interiorBlockCement);
    roundedRes.exteriorBlockSand = Math.ceil(res.exteriorBlockSand);
    roundedRes.interiorBlockSand = Math.ceil(res.interiorBlockSand);
    roundedRes.plasterWallsLabor = Math.ceil(res.plasterWallsLabor);
    roundedRes.plasterCeilingLabor = Math.ceil(res.plasterCeilingLabor);
    roundedRes.plasterWallsMaterial = Math.ceil(res.plasterWallsMaterial);
    roundedRes.plasterCement = Math.ceil(res.plasterCement);
    roundedRes.plasterSand = Math.ceil(res.plasterSand);
    roundedRes.paintWalls = Math.ceil(res.paintWalls);
    roundedRes.paintCeiling = Math.ceil(res.paintCeiling);
    roundedRes.putty = Math.ceil(res.putty);
    roundedRes.primer = Math.ceil(res.primer);
    roundedRes.paint = Math.ceil(res.paint);
    roundedRes.tileFloorArea = Math.ceil(res.tileFloorArea);
    roundedRes.tileKitchenFloor = Math.ceil(res.tileKitchenFloor);
    roundedRes.tileBathroomFloor = Math.ceil(res.tileBathroomFloor);
    roundedRes.tileKitchenWalls = Math.ceil(res.tileKitchenWalls);
    roundedRes.tileBathroomWalls = Math.ceil(res.tileBathroomWalls);
    roundedRes.tileCement = Math.ceil(res.tileCement);
    roundedRes.tileSand = Math.ceil(res.tileSand);
    roundedRes.marbleArea = Math.ceil(res.marbleArea);
    roundedRes.marbleConcrete = Math.ceil(res.marbleConcrete);
    roundedRes.marbleCement = Math.ceil(res.marbleCement);
    roundedRes.marbleSand = Math.ceil(res.marbleSand);
    roundedRes.marbleAggregate = Math.ceil(res.marbleAggregate);
    roundedRes.electricalPoints = Math.ceil(res.electricalPoints);
    roundedRes.plumbingPoints = Math.ceil(res.plumbingPoints);
    roundedRes.windowGroups = res.windowGroups;
    roundedRes.doorGroups = res.doorGroups;

    // ✅ القيم المصححة (تخزينها)
    roundedRes.correctedPlasterWalls = Math.ceil(res.correctedPlasterWalls);
    roundedRes.correctedPlasterCeiling = Math.ceil(res.correctedPlasterCeiling);
    roundedRes.correctedPlasterArea = Math.ceil(res.correctedPlasterArea);
    roundedRes.correctedPaintWalls = Math.ceil(res.correctedPaintWalls);
    roundedRes.correctedPaintCeiling = Math.ceil(res.correctedPaintCeiling);
    roundedRes.correctedPaintTotal = Math.ceil(res.correctedPaintTotal);
    roundedRes.correctedTileFloor = Math.ceil(res.correctedTileFloor);
    roundedRes.correctedTileKitchenWalls = Math.ceil(res.correctedTileKitchenWalls);
    roundedRes.correctedTileBathroomWalls = Math.ceil(res.correctedTileBathroomWalls);
    roundedRes.correctedTileTotalArea = Math.ceil(res.correctedTileTotalArea);
    roundedRes.correctedTileCement = Math.ceil(res.correctedTileCement);
    roundedRes.correctedTileSand = Math.ceil(res.correctedTileSand);

    setResults(roundedRes);
    setElectricalPts(Math.ceil(res.electricalPoints));
    setPlumbingPts(Math.ceil(res.plumbingPoints));

    // ✅ حساب الإجماليات
    const totalBlocks = Math.ceil(roundedRes.exteriorBlocks + roundedRes.interiorBlocks);
    const totalDoors = roundedRes.doorGroups.reduce((s, g) => s + g.count, 0);
    const totalWindows = roundedRes.windowGroups.reduce((s, g) => s + g.count, 0);

    // ✅ حفظ جميع البيانات في localStorage
    const dataToSave = {
      totalBlocks,
      totalCement: Math.ceil(roundedRes.totalCement),
      totalSand: Math.ceil(roundedRes.totalSand),
      totalAggregate: Math.ceil(roundedRes.totalAggregate),
      totalMarbleArea: Math.ceil(roundedRes.marbleArea),
      totalDoors,
      totalWindows,
      // البلوك
      blockOuter: { blocks: roundedRes.exteriorBlocks, cement: roundedRes.exteriorBlockCement, sand: roundedRes.exteriorBlockSand },
      blockInner: { blocks: roundedRes.interiorBlocks, cement: roundedRes.interiorBlockCement, sand: roundedRes.interiorBlockSand },
      // التلييس (القيم المصححة)
      plaster: { area: roundedRes.correctedPlasterWalls, cement: roundedRes.correctedPlasterCement, sand: roundedRes.correctedPlasterSand },
      // الطلاء (القيم المصححة)
      paint: { area: roundedRes.correctedPaintWalls, putty: Math.ceil(roundedRes.correctedPaintTotal * 0.8), primer: Math.ceil(roundedRes.correctedPaintTotal / 8), paint: Math.ceil(roundedRes.correctedPaintTotal / 8) },
      // البلاط (القيم المصححة)
      tile: { floor: roundedRes.correctedTileFloor, kitchenWalls: roundedRes.correctedTileKitchenWalls, bathroomWalls: roundedRes.correctedTileBathroomWalls },
      // الرخام
      marble: { area: roundedRes.marbleArea, aggregate: roundedRes.marbleAggregate, cement: roundedRes.marbleCement, sand: roundedRes.marbleSand },
      // الإضافات
      extras: { bathrooms: regions.filter(r => r.type === 'bathroom').length, kitchens: regions.filter(r => r.type === 'kitchen').length, windows: windows.length, doors: doors.length },
      // عمالة
      labor: { blockArea: roundedRes.exteriorWallNet + roundedRes.interiorWallNet },
      // مساحات إضافية (القيم المصححة)
      exteriorWallNet: roundedRes.exteriorWallNet,
      interiorWallNet: roundedRes.interiorWallNet,
      exteriorWallGross: roundedRes.exteriorWallGross,
      interiorWallGross: roundedRes.interiorWallGross,
      paintWalls: roundedRes.correctedPaintWalls,
      paintCeiling: roundedRes.correctedPaintCeiling,
      plasterWallsLabor: roundedRes.correctedPlasterWalls,
      plasterCeilingLabor: roundedRes.correctedPlasterCeiling,
      innerWallArea: roundedRes.innerWallArea,
      tileFloorArea: roundedRes.correctedTileFloor,
      tileKitchenFloor: roundedRes.tileKitchenFloor,
      tileBathroomFloor: roundedRes.tileBathroomFloor,
      tileKitchenWalls: roundedRes.correctedTileKitchenWalls,
      tileBathroomWalls: roundedRes.correctedTileBathroomWalls,
    };

    localStorage.setItem('hasMarble', JSON.stringify(hasMarble));
    localStorage.setItem('finishes_results', JSON.stringify(dataToSave));
  };

  return (
    <div style={{ padding: 12 }}>
      <FinishInputs
        floorHeight={floorHeight}
        hasMarble={hasMarble}
        onFloorHeightChange={setFloorHeight}
        onHasMarbleChange={setHasMarble}
        onCalculate={calculate}
      />

      {results && (
        <FinishTables
          results={results}
          hasMarble={hasMarble}
          electricalPts={electricalPts}
          plumbingPts={plumbingPts}
          onElectricalChange={setElectricalPts}
          onPlumbingChange={setPlumbingPts}
        />
      )}
    </div>
  );
};
