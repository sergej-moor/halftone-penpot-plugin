import { writable, get } from 'svelte/store';
import type { Fill } from '@penpot/plugin-types';
import { processImage } from '../utils/imageProcessing';
import type { SelectionState } from '../types';
import { HALFTONE_CONSTANTS } from '../constants/halftone';

const initialState: SelectionState = {
  id: '',
  name: '',
  fills: [],
  isLoading: false,
  isProcessing: false,
  isUploadingFill: false,
  isPreviewLoading: false,
  patternType: 'dots',
  angle: HALFTONE_CONSTANTS.DEFAULT_ANGLE,
  size: HALFTONE_CONSTANTS.DEFAULT_SIZE,
  saturation: HALFTONE_CONSTANTS.DEFAULT_SATURATION,
  contrast: HALFTONE_CONSTANTS.DEFAULT_CONTRAST,
  error: undefined,
};

export const selection = writable<SelectionState>(initialState);

export function updateSelection(
  shapes: { id: string; name: string; fills: Fill[] | 'mixed' } | null
): void {
  // If no shapes or shapes is null, reset to initial state
  if (!shapes) {
    selection.set(initialState);
    return;
  }

  // Use Penpot's ID directly
  selection.update(() => ({
    ...initialState,
    id: shapes.id,
    name: shapes.name,
    fills: shapes.fills,
    // Clear all image data
    originalImage: undefined,
    exportedImage: undefined,
    previewImage: undefined,
  }));
}

export async function updatePreview(params: {
  size: number;
  angle: number;
  saturation: number;
  contrast: number;
}): Promise<void> {
  const state = get(selection);
  if (!state.originalImage || !state.name || !state.fills || !state.id) return;
  const currentId = state.id;

  try {
    selection.update((state) => ({
      ...state,
      isPreviewLoading: true,
      previewImage: undefined,
    }));

    const processed = await processImage(
      new Uint8Array(state.originalImage.data),
      state.originalImage.width,
      state.originalImage.height,
      {
        ...params,
        patternType: state.patternType,
      }
    );

    // Check if we still have the same selection
    const currentState = get(selection);
    if (
      !currentState.name ||
      !currentState.fills ||
      currentState.id !== currentId
    ) {
      return;
    }

    selection.update((state) => ({
      ...state,
      ...params,
      isPreviewLoading: false,
      previewImage: {
        width: state.originalImage!.width,
        height: state.originalImage!.height,
        data: Array.from(processed.data),
      },
    }));
  } catch (error) {
    console.error('Failed to update preview:', error);
    selection.update((state) => ({
      ...state,
      isPreviewLoading: false,
      previewImage: undefined,
    }));
  }
}

export async function applyImageEffect(
  params: {
    size: number;
    angle: number;
    saturation: number;
    contrast: number;
  },
  addNewLayer: boolean
): Promise<void> {
  const state = get(selection);
  if (!state.originalImage || !state.fills?.length || !state.name) return;

  try {
    selection.update((state) => ({ ...state, isProcessing: true }));

    const processed = await processImage(
      new Uint8Array(state.originalImage.data),
      state.originalImage.width,
      state.originalImage.height,
      {
        ...params,
        patternType: state.patternType,
      }
    );

    // Check if we still have a selection before continuing
    const currentState = get(selection);
    if (!currentState.name || !currentState.fills) {
      return;
    }

    selection.update((state) => ({ ...state, isUploadingFill: true }));

    // Send the processed image to be uploaded
    const message = {
      type: 'update-image-fill' as const,
      imageData: processed.data,
      fillIndex: 0,
      originalFill: state.fills[state.fills.length - 1],
      shouldDeleteFirst: !addNewLayer && state.fills.length >= 2,
      addNewLayer,
    };
    window.parent.postMessage(message, '*');

    // Update the preview with the processed image
    selection.update((state) => ({
      ...state,
      ...params,
      isProcessing: false,
      processedImage: {
        width: state.originalImage!.width,
        height: state.originalImage!.height,
        data: Array.from(processed.data),
      },
    }));
  } catch (error) {
    console.error('Failed to process image:', error);
    selection.update((state) => ({ ...state, isProcessing: false }));
  }
}

export function updateExportedImage(
  imageData: number[],
  width: number,
  height: number,
  selectionId: string
): void {
  try {
    let currentState: SelectionState;

    selection.update((state) => {
      // Only update if we still have the same selection
      if (!state.name || !state.fills || state.id !== selectionId) {
        return state;
      }

      currentState = {
        ...state,
        isLoading: false,
        originalImage: {
          data: imageData,
          width,
          height,
        },
        // Initialize processedImage with original image data
        processedImage: {
          data: imageData,
          width,
          height,
        },
      };

      return currentState;
    });

    // Call updatePreview after the state update is complete
    if (currentState!) {
      setTimeout(() => {
        // Add small delay to ensure state is updated
        updatePreview({
          size: currentState.size,
          angle: currentState.angle,
          saturation: currentState.saturation,
          contrast: currentState.contrast,
        });
      }, 0);
    }
  } catch (error) {
    console.error('Failed to update exported image:', error);
    selection.update((state) => ({
      ...state,
      isLoading: false,
      error:
        'Failed to process image. Please try again with a different selection.',
    }));
  }
}

export function setUploadingFill(isUploading: boolean): void {
  selection.update((state) => {
    // Only update if we still have a selection
    if (!state.name || !state.fills) {
      return initialState;
    }
    return {
      ...state,
      isUploadingFill: isUploading,
    };
  });
}

export function setLoading(isLoading: boolean): void {
  selection.update((state) => {
    // If setting to false and we don't have a selection, reset to initial state
    if (!isLoading && (!state.name || !state.fills)) {
      return initialState;
    }
    return {
      ...state,
      isLoading,
    };
  });
}
