import { useMemo } from 'react';
import type { Wall, Column, Window, Door, CalculationResults } from '../core/types';
import { calculateResults } from '../core/calculations';

export function useCalculations(
  walls: Wall[],
    columns: Column[],
      windows: Window[],
        doors: Door[],
          buildingHeight: number,
          ): CalculationResults | null {
            return useMemo(() => {
                if (walls.length === 0) return null;
                    return calculateResults(walls, columns, windows, doors, buildingHeight);
                      }, [walls, columns, windows, doors, buildingHeight]);
                      }