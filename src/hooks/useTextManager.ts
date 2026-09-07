import { useState, useCallback } from 'react';
import type { TextElement } from '../core/types';
import { DEFAULT_TEXT } from '../core/types';
import { v4 as uuidv4 } from 'uuid';

export function useTextManager() {
  const [texts, setTexts] = useState<TextElement[]>([]);

    const addText = useCallback((position: { x: number; y: number }, text: string) => {
        setTexts(prev => [...prev, {
              id: uuidv4(),
                    position,
                          text,
                                fontSize: DEFAULT_TEXT.fontSize,
                                      color: DEFAULT_TEXT.color,
                                            rotation: DEFAULT_TEXT.rotation,
                                                }]);
                                                  }, []);

                                                    const updateText = useCallback((id: string, patch: Partial<TextElement>) => {
                                                        setTexts(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
                                                          }, []);

                                                            const removeText = useCallback((id: string) => {
                                                                setTexts(prev => prev.filter(t => t.id !== id));
                                                                  }, []);

                                                                    const setAllTexts = useCallback((newTexts: TextElement[]) => {
                                                                        setTexts(newTexts);
                                                                          }, []);

                                                                            return {
                                                                                texts,
                                                                                    addText,
                                                                                        updateText,
                                                                                            removeText,
                                                                                                setAllTexts,
                                                                                                  };
                                                                                                  }