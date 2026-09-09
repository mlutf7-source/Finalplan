import React from 'react';
import { CanvasRenderer } from './CanvasRenderer';
import { ElementLayer } from './ElementLayer';
import { ElementEditLayer } from './ElementEditLayer';
import { TextLayer } from './TextLayer';
import { TextEditLayer } from './TextEditLayer';
import { DimensionLayer } from './DimensionLayer';
import { RegionLayer } from './RegionLayer';
import { StairLayer } from './StairLayer';
import { StairEditLayer } from './StairEditLayer';
import { NorthArrowLayer } from './NorthArrowLayer';
import { NorthArrowEditLayer } from './NorthArrowEditLayer';
import { ClipFrameLayer } from './ClipFrameLayer';
import { ClipFrameEditLayer } from './ClipFrameEditLayer';
import type { Wall, CanvasView, Column, Window, Door, TextElement, Stair, NorthArrow, ClipFrame, PlanImage } from '../../core/types';
import type { Dimension } from '../../core/dimensionTypes';
import type { RoomRegion } from '../../core/regionTypes';

interface Props {
  walls: Wall[]; windows: Window[]; doors: Door[]; view: CanvasView; width: number; height: number; selectedWallId: string | null; tempStart: { x: number; y: number } | null; tempEnd: { x: number; y: number } | null; columns: Column[]; texts: TextElement[]; regions: RoomRegion[]; stairs: Stair[]; northArrows: NorthArrow[]; clipFrames: ClipFrame[]; selectedStairId: string | null; selectedElement: { id: string; type: 'column' | 'window' | 'door' } | null; selectedTextId: string | null; selectedNorthArrowId: string | null; selectedClipFrameId: string | null; dimensions: Dimension[]; dimensionFontSize: number; selectedDimId: string | null; scale?: number; planImage?: PlanImage | null;
}

export const CanvasLayers: React.FC<Props> = React.memo((props) => {
  const { walls, windows, doors, view, width, height, selectedWallId, tempStart, tempEnd, columns, texts, regions, stairs, northArrows, clipFrames, selectedStairId, selectedElement, selectedTextId, selectedNorthArrowId, selectedClipFrameId, dimensions, dimensionFontSize, selectedDimId, scale = 1, planImage = null } = props;

  return (
    <>
      <CanvasRenderer walls={walls} view={view} width={width} height={height} selectedId={selectedWallId} tempStart={tempStart} tempEnd={tempEnd} scale={scale} planImage={planImage} />
      <ElementLayer columns={columns} windows={windows} doors={doors} walls={walls} view={view} width={width} height={height} scale={scale} />
      <ElementEditLayer selected={selectedElement} columns={columns} windows={windows} doors={doors} walls={walls} view={view} width={width} height={height} />
      {texts.length > 0 && (<TextLayer texts={texts} view={view} width={width} height={height} selectedId={selectedTextId} scale={scale} />)}
      <TextEditLayer selectedText={texts.find(t => t.id === selectedTextId) ?? null} view={view} width={width} height={height} />
      {dimensions.length > 0 && (<DimensionLayer dimensions={dimensions} view={view} width={width} height={height} fontSize={dimensionFontSize} selectedId={selectedDimId} scale={scale} />)}
      <RegionLayer regions={regions} view={view} width={width} height={height} scale={scale} />
      <StairLayer stairs={stairs} view={view} width={width} height={height} scale={scale} />
      <StairEditLayer selectedStair={stairs.find(s => s.id === selectedStairId) ?? null} view={view} width={width} height={height} />
      <NorthArrowLayer northArrows={northArrows} view={view} width={width} height={height} selectedId={selectedNorthArrowId} scale={scale} />
      <NorthArrowEditLayer selectedArrow={northArrows.find(a => a.id === selectedNorthArrowId) ?? null} view={view} width={width} height={height} />
      <ClipFrameLayer clipFrames={clipFrames} view={view} width={width} height={height} selectedId={selectedClipFrameId} scale={scale} />
      <ClipFrameEditLayer selectedClipFrame={clipFrames.find(f => f.id === selectedClipFrameId) ?? null} view={view} width={width} height={height} />
    </>
  );
});
