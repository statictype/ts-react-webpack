import React from 'react';
import { render as testingLibraryRender, RenderResult } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { renderHook as testingLibraryRenderHook, WrapperComponent, RenderHookOptions, RenderHookResult } from '@testing-library/react-hooks';
import { CanvasContext, DbContext } from '../src/ui/contexts';
import { CanvasState, DbState } from '../src/types';
import { mockCanvasState, mockDbState } from './mocks';

export type RenderedPlusStates<T> = [T, CanvasState, DbState];

export function render (ui: React.ReactElement, canvas?: Partial<CanvasState>, db?: Partial<DbState>): RenderedPlusStates<RenderResult> {
  const canvasState = { ...mockCanvasState, ...canvas } as CanvasState;
  const dbState = { ...mockDbState, ...db };

  return [
    testingLibraryRender(
      <CanvasContext.Provider value={canvasState}>
        <DbContext.Provider value={dbState}>
          <MemoryRouter>
            {ui}
          </MemoryRouter>
        </DbContext.Provider>
      </CanvasContext.Provider>
    ),
    canvasState,
    dbState
  ];
};

export function renderHook<T, U> (
  callback: (_: T) => U,
  canvas?: Partial<CanvasState>,
  db?: Partial<DbState>,
  options?: RenderHookOptions<T>
): RenderedPlusStates<RenderHookResult<T, U>> {
  const canvasState = { ...mockCanvasState, ...canvas } as CanvasState;
  const dbState = { ...mockDbState, ...db };

  const wrapper = createWrapper<T>(canvasState, dbState);

  return [
    testingLibraryRenderHook<T, U>(callback, { wrapper, ...options }),
    canvasState,
    dbState
  ]
}

export function createWrapper<T> (canvas?: Partial<CanvasState>, db?: Partial<DbState>): WrapperComponent<T> {
  const canvasState = { ...mockCanvasState, ...canvas } as CanvasState;
  const dbState = { ...mockDbState, ...db } as DbState;

  return ({ children }) => {
    return (
      <CanvasContext.Provider value={canvasState}>
        <DbContext.Provider value={dbState}>
          <MemoryRouter>
            {children}
          </MemoryRouter>
        </DbContext.Provider>
      </CanvasContext.Provider>
    )
  };
}