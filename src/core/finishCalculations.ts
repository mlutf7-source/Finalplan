import type { Wall, Column, Window, Door } from './types';
import type { RoomRegion } from './regionTypes';
import { distance } from './geometry';

export interface FinishesInput {
  floorHeight: number;
  hasMarble: boolean;
}

export interface OpeningGroup {
  width: number;
  height: number;
  count: number;
  unitArea: number;
  totalArea: number;
}

export interface FinishResults {
  // مساحات أساسية
  exteriorWallGross: number;
  interiorWallGross: number;
  ceilingArea: number;
  floorArea: number;
  kitchenArea: number;
  bathroomArea: number;
  kitchenWallArea: number;
  bathroomWallArea: number;
  // صافي مساحات الجدران (بعد خصم الأعمدة والفتحات)
  exteriorWallNet: number;
  interiorWallNet: number;
  // خصومات الأعمدة والنوافذ والأبواب
  outerColumnArea: number;
  innerColumnArea: number;
  extWindowArea: number;
  intWindowArea: number;
  extDoorArea: number;
  intDoorArea: number;
  innerWallArea: number;
  // كميات بناء الجدران
  exteriorBlocks: number;
  exteriorBlockCement: number;
  exteriorBlockSand: number;
  interiorBlocks: number;
  interiorBlockCement: number;
  interiorBlockSand: number;
  // التلييس
  plasterWallsLabor: number;
  plasterCeilingLabor: number;
  plasterWallsMaterial: number;
  plasterCement: number;
  plasterSand: number;
  // الطلاء
  paintWalls: number;
  paintCeiling: number;
  putty: number;
  primer: number;
  paint: number;
  // البلاط
  tileFloorArea: number;
  tileKitchenFloor: number;
  tileBathroomFloor: number;
  tileKitchenWalls: number;
  tileBathroomWalls: number;
  tileCement: number;
  tileSand: number;
  // الرخام
  marbleArea: number;
  marbleConcrete: number;
  marbleCement: number;
  marbleSand: number;
  marbleAggregate: number;
  // الكهرباء والسباكة
  electricalPoints: number;
  plumbingPoints: number;
  // مجموعات النوافذ والأبواب
  windowGroups: OpeningGroup[];
  doorGroups: OpeningGroup[];
  // إجماليات
  totalBlocks: number;
  totalCement: number;
  totalSand: number;
  totalAggregate: number;

  // ✅ القيم المصححة (جديدة)
  correctedPlasterWalls: number;
  correctedPlasterCeiling: number;
  correctedPlasterArea: number;
  correctedPaintWalls: number;
  correctedPaintCeiling: number;
  correctedPaintTotal: number;
  correctedTileFloor: number;
  correctedTileKitchenWalls: number;
  correctedTileBathroomWalls: number;
  correctedTileTotalArea: number;
  correctedTileCement: number;
  correctedTileSand: number;
}

function distanceToSegment(p: {x:number;y:number}, a: {x:number;y:number}, b: {x:number;y:number}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

function polygonPerimeter(polygon: {x:number;y:number}[]): number {
  let per = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    per += distance(polygon[i], polygon[j]);
  }
  return per;
}

export function calculateFinishes(
  walls: Wall[],
  columns: Column[],
  windows: Window[],
  doors: Door[],
  regions: RoomRegion[],
  input: FinishesInput,
): FinishResults {
  const { floorHeight, hasMarble } = input;

  const extWalls = walls.filter(w => w.type === 'exterior');
  const intWalls = walls.filter(w => w.type === 'interior');

  // مساحات الجدران الإجمالية
  const exteriorWallGross = extWalls.reduce((s, w) => s + distance(w.start, w.end) * floorHeight, 0);
  const interiorWallGross = intWalls.reduce((s, w) => s + distance(w.start, w.end) * floorHeight, 0);

  // مساحة الأسقف = مساحة الأرضية (تقريبية من الجدران الخارجية)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  extWalls.forEach(w => {
    minX = Math.min(minX, w.start.x, w.end.x);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    minY = Math.min(minY, w.start.y, w.end.y);
    maxY = Math.max(maxY, w.start.y, w.end.y);
  });
  const floorArea = Math.max(0, (maxX - minX) * (maxY - minY));
  const ceilingArea = floorArea;

  // مساحات جدران المطابخ والحمامات من المناطق
  const kitchenRegions = regions.filter(r => r.type === 'kitchen');
  const bathroomRegions = regions.filter(r => r.type === 'bathroom');
  const kitchenArea = kitchenRegions.reduce((s, r) => s + r.area, 0);
  const bathroomArea = bathroomRegions.reduce((s, r) => s + r.area, 0);
  const kitchenWallArea = kitchenRegions.reduce((s, r) => s + polygonPerimeter(r.polygon) * floorHeight, 0);
  const bathroomWallArea = bathroomRegions.reduce((s, r) => s + polygonPerimeter(r.polygon) * floorHeight, 0);

  // حساب مساحات الأعمدة
  let outerColumnArea = 0;
  let innerColumnArea = 0;
  columns.forEach(col => {
    const colHeight = floorHeight;
    const colLongSide = col.length;

    let isOnExterior = false;
    let isOnInterior = false;
    extWalls.forEach(wall => {
      const dist = distanceToSegment(col.position, wall.start, wall.end);
      if (dist < col.width / 2 + wall.thickness / 2) {
        isOnExterior = true;
      }
    });

    intWalls.forEach(wall => {
      const dist = distanceToSegment(col.position, wall.start, wall.end);
      if (dist < col.width / 2 + wall.thickness / 2) {
        isOnInterior = true;
      }
    });

    if (isOnExterior && isOnInterior) {
      let closestInteriorDist = Infinity;
      intWalls.forEach(wall => {
        const dist = distanceToSegment(col.position, wall.start, wall.end);
        if (dist < closestInteriorDist) closestInteriorDist = dist;
      });

      if (closestInteriorDist < col.width / 2) {
        outerColumnArea += 0.2 * colHeight;
        innerColumnArea += (colLongSide - 0.2) * colHeight;
      } else {
        innerColumnArea += 0.2 * colHeight;
        outerColumnArea += (colLongSide - 0.2) * colHeight;
      }
    } else if (isOnExterior) {
      outerColumnArea += colLongSide * colHeight;
    } else if (isOnInterior) {
      innerColumnArea += colLongSide * colHeight;
    }
  });

  // تصنيف النوافذ إلى خارجية/داخلية
  let extWindowArea = 0;
  let intWindowArea = 0;
  windows.forEach(win => {
    const wall = walls.find(w => w.id === win.wallId);
    if (!wall) return;
    const area = win.width * win.height;
    if (wall.type === 'exterior') extWindowArea += area;
    else intWindowArea += area;
  });

  // تصنيف الأبواب إلى خارجية/داخلية
  let extDoorArea = 0;
  let intDoorArea = 0;
  doors.forEach(door => {
    const wall = walls.find(w => w.id === door.wallId);
    if (!wall) return;
    const area = door.width * door.height;
    if (wall.type === 'exterior') extDoorArea += area;
    else intDoorArea += area;
  });

  // صافي مساحات الجدران (للمواد)
  const innerWallArea = intWalls.reduce((s, w) => s + distance(w.start, w.end) * w.thickness, 0);
  const exteriorWallNet = Math.max(0, exteriorWallGross - outerColumnArea - extWindowArea - extDoorArea);
  const interiorWallNet = Math.max(0, interiorWallGross - innerColumnArea - intWindowArea - intDoorArea);

  // ===== كميات البناء =====
  const exteriorBlocks = Math.ceil(exteriorWallNet * 12.5);
  const interiorBlocks = Math.ceil(interiorWallNet * 12.5);
  const exteriorBlockCement = Math.ceil(exteriorBlocks / 50);
  const interiorBlockCement = Math.ceil(interiorBlocks / 50);
  const exteriorBlockSand = exteriorBlockCement * 0.15;
  const interiorBlockSand = interiorBlockCement * 0.15;

  // ===== التلييس =====
  const plasterWallsLabor = (exteriorWallGross + interiorWallGross * 2) - kitchenWallArea - bathroomWallArea;
  const plasterCeilingLabor = ceilingArea;
  const plasterWallsMaterial = (exteriorWallGross + interiorWallGross * 2) - extWindowArea - extDoorArea - intWindowArea - intDoorArea - kitchenWallArea - bathroomWallArea;
  const plasterArea = plasterWallsMaterial + ceilingArea;
  const plasterCement = plasterArea * 0.15;
  const plasterSand = plasterCement * 0.15;

  // ===== الطلاء =====
  const paintWalls = plasterWallsLabor;
  const paintCeiling = ceilingArea;
  const paintTotal = paintWalls + paintCeiling;

  const putty = paintTotal * 0.8;  // كل 1 م² -> 0.8 كجم معجون
  const primer = paintTotal / 8;   // كل 8 م² -> 1 كجم أساس
  const paint = paintTotal / 8;    // كل 8 م² -> 1 كجم طلاء زيتي

  // ===== البلاط =====
  const tileFloorArea = Math.max(0, floorArea - kitchenArea - bathroomArea);
  const tileKitchenFloor = kitchenArea;
  const tileBathroomFloor = bathroomArea;
  const tileKitchenWalls = kitchenWallArea;
  const tileBathroomWalls = bathroomWallArea;
  const tileTotalArea = tileFloorArea + tileKitchenFloor + tileBathroomFloor + tileKitchenWalls + tileBathroomWalls;
  const tileCement = tileTotalArea * 0.3;
  const tileSand = tileCement * 0.15;

  // ===== الرخام =====
  const marbleArea = hasMarble ? Math.max(0, exteriorWallGross - extWindowArea - extDoorArea) : 0;
  const marbleConcrete = marbleArea * 0.04;
  const marbleCement = marbleArea * 0.3;
  const marbleSand = marbleCement * 0.07;
  const marbleAggregate = marbleCement * 0.075;

  // ===== الكهرباء والسباكة =====
  const electricalPoints = floorArea * 0.7;
  const plumbingPoints = bathroomRegions.length * 5 + kitchenRegions.length * 4 + 3;

  // ===== تجميع النوافذ والأبواب حسب الأبعاد =====
  const windowGroups: OpeningGroup[] = [];
  const winMap = new Map<string, { width: number; height: number; count: number }>();
  windows.forEach(w => {
    const key = `${w.width}x${w.height}`;
    const existing = winMap.get(key);
    if (existing) existing.count++;
    else winMap.set(key, { width: w.width, height: w.height, count: 1 });
  });
  winMap.forEach(v => {
    windowGroups.push({
      width: v.width,
      height: v.height,
      count: v.count,
      unitArea: v.width * v.height,
      totalArea: v.width * v.height * v.count,
    });
  });

  const doorGroups: OpeningGroup[] = [];
  const doorMap = new Map<string, { width: number; height: number; count: number }>();
  doors.forEach(d => {
    const key = `${d.width}x${d.height}`;
    const existing = doorMap.get(key);
    if (existing) existing.count++;
    else doorMap.set(key, { width: d.width, height: d.height, count: 1 });
  });
  doorMap.forEach(v => {
    doorGroups.push({
      width: v.width,
      height: v.height,
      count: v.count,
      unitArea: v.width * v.height,
      totalArea: v.width * v.height * v.count,
    });
  });

  // ===== القيم المصححة (الموحدة) =====
  const correctedPlasterWalls = Math.max(0, plasterWallsLabor - (extWindowArea + extDoorArea + intWindowArea + intDoorArea) - (kitchenWallArea + bathroomWallArea));
  const correctedPlasterCeiling = Math.max(0, ceilingArea - innerWallArea);
  const correctedPlasterArea = correctedPlasterWalls + correctedPlasterCeiling;
  const correctedPlasterCement = Math.ceil(correctedPlasterArea * 0.15);
  const correctedPlasterSand = Math.ceil(correctedPlasterCement * 0.15);

  const correctedPaintWalls = correctedPlasterWalls;
  const correctedPaintCeiling = correctedPlasterCeiling;
  const correctedPaintTotal = correctedPaintWalls + correctedPaintCeiling;

  const correctedTileFloor = Math.max(0, tileFloorArea - innerWallArea);
  const correctedTileKitchenWalls = Math.max(0, tileKitchenWalls - 2);
  const correctedTileBathroomWalls = Math.max(0, tileBathroomWalls - 2);
  const correctedTileTotalArea = correctedTileFloor + tileKitchenFloor + tileBathroomFloor + correctedTileKitchenWalls + correctedTileBathroomWalls;
  const correctedTileCement = Math.ceil(correctedTileTotalArea * 0.3);
  const correctedTileSand = Math.ceil(correctedTileCement * 0.15);

  // ===== الإجماليات =====
  const totalBlocks = exteriorBlocks + interiorBlocks;
  const totalCement = exteriorBlockCement + interiorBlockCement + plasterCement + tileCement + marbleCement;
  const totalSand = exteriorBlockSand + interiorBlockSand + plasterSand + tileSand + marbleSand;
  const totalAggregate = marbleAggregate;

  return {
    exteriorWallGross,
    interiorWallGross,
    ceilingArea,
    floorArea,
    kitchenArea,
    bathroomArea,
    kitchenWallArea,
    bathroomWallArea,
    exteriorWallNet,
    interiorWallNet,
    outerColumnArea,
    innerColumnArea,
    extWindowArea,
    intWindowArea,
    extDoorArea,
    intDoorArea,
    innerWallArea,
    exteriorBlocks,
    exteriorBlockCement,
    exteriorBlockSand,
    interiorBlocks,
    interiorBlockCement,
    interiorBlockSand,
    plasterWallsLabor,
    plasterCeilingLabor,
    plasterWallsMaterial,
    plasterCement,
    plasterSand,
    paintWalls,
    paintCeiling,
    putty,
    primer,
    paint,
    tileFloorArea,
    tileKitchenFloor,
    tileBathroomFloor,
    tileKitchenWalls,
    tileBathroomWalls,
    tileCement,
    tileSand,
    marbleArea,
    marbleConcrete,
    marbleCement,
    marbleSand,
    marbleAggregate,
    electricalPoints,
    plumbingPoints,
    windowGroups,
    doorGroups,
    totalBlocks,
    totalCement,
    totalSand,
    totalAggregate,

    // القيم المصححة
    correctedPlasterWalls,
    correctedPlasterCeiling,
    correctedPlasterArea,
    correctedPaintWalls,
    correctedPaintCeiling,
    correctedPaintTotal,
    correctedTileFloor,
    correctedTileKitchenWalls,
    correctedTileBathroomWalls,
    correctedTileTotalArea,
    correctedTileCement,
    correctedTileSand,
  };
  }
