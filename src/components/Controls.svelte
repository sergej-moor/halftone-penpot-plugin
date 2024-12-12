<script lang="ts">
  import {
    selection,
    applyImageEffect,
    updatePreview,
  } from '../stores/selection';
  import { HALFTONE_CONSTANTS } from '../constants/halftone';
  import { tooltip } from '../actions/tooltip';

  let currentValues = {
    size: $selection.size,
    angle: $selection.angle,
    saturation: $selection.saturation,
    contrast: $selection.contrast,
  };

  let displayValues = { ...currentValues };
  let lastSelectionId = $selection.id;
  let realtimePreview = false;
  let previousRealtimeState = false;

  function handleInput(param: keyof typeof currentValues) {
    return (event: Event): void => {
      const input = event.target as HTMLInputElement;
      displayValues[param] = parseFloat(input.value);
    };
  }

  function handleChange(param: keyof typeof currentValues) {
    return (event: Event): void => {
      const input = event.target as HTMLInputElement;
      const value = parseFloat(input.value);
      currentValues[param] = value;
      displayValues[param] = value;

      updatePreview(currentValues);

      if (realtimePreview) {
        handleApplyEffect();
      }
    };
  }

  function handleApplyEffect(): void {
    applyImageEffect(currentValues, false);
  }

  function handleAddNewLayer(): void {
    applyImageEffect(currentValues, true);
  }

  // Watch for changes in realtime preview and selection fills
  $: {
    if (previousRealtimeState !== realtimePreview) {
      if (realtimePreview) {
        handleApplyEffect();
      } else if ($selection.fills.length > 0) {
        handleDeleteTopLayer();
      }
      previousRealtimeState = realtimePreview;
    }
  }

  function handleDeleteTopLayer(): void {
    window.parent.postMessage(
      {
        type: 'delete-top-layer',
      },
      '*'
    );
  }

  // Update values when selection changes
  $: if ($selection.id !== lastSelectionId) {
    currentValues = {
      size: $selection.size,
      angle: $selection.angle,
      saturation: $selection.saturation,
      contrast: $selection.contrast,
    };
    displayValues = { ...currentValues };
    lastSelectionId = $selection.id;
  }

  $: isDisabled = !$selection.processedImage;
  $: isProcessing =
    $selection.isProcessing ||
    $selection.isUploadingFill ||
    $selection.isPreviewLoading;
  $: shouldDisableApply = isDisabled || isProcessing || realtimePreview;
</script>

<div class="flex flex-col gap-4 min-w-72 w-full h-full justify-between">
  <div class="flex flex-col">
    <label class="slider-row">
      <span
        class="body-s"
        use:tooltip={{
          text: 'Adjust the size of halftone dots',
          maxWidth: 'max-w-[200px]',
          position: 'right',
        }}
      >
        Dot Size:
      </span>
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            type="range"
            min={HALFTONE_CONSTANTS.MIN_SIZE}
            max={HALFTONE_CONSTANTS.MAX_SIZE}
            value={displayValues.size}
            on:input={handleInput('size')}
            on:change={handleChange('size')}
            class="w-full {isDisabled || isProcessing ? 'opacity-50' : ''}"
            disabled={isDisabled || isProcessing}
          />
        </div>
        <span class="text-sm w-12 text-right">{displayValues.size}</span>
      </div>
    </label>

    <label class="slider-row">
      <span
        class="body-s"
        use:tooltip={{
          text: 'Adjust the angle of the halftone pattern',
          maxWidth: 'max-w-[200px]',
          position: 'right',
        }}
      >
        Angle:
      </span>
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            type="range"
            min={HALFTONE_CONSTANTS.MIN_ANGLE}
            max={HALFTONE_CONSTANTS.MAX_ANGLE}
            value={displayValues.angle}
            on:input={handleInput('angle')}
            on:change={handleChange('angle')}
            class="w-full {isDisabled || isProcessing ? 'opacity-50' : ''}"
            disabled={isDisabled || isProcessing}
          />
        </div>
        <span class="text-sm w-8 text-right">{displayValues.angle}°</span>
      </div>
    </label>

    <label class="slider-row">
      <span
        class="body-s"
        use:tooltip={{
          text: 'Adjust the color saturation',
          maxWidth: 'max-w-[200px]',
          position: 'right',
        }}
      >
        Saturation:
      </span>
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            type="range"
            min={HALFTONE_CONSTANTS.MIN_SATURATION}
            max={HALFTONE_CONSTANTS.MAX_SATURATION}
            step="0.1"
            value={displayValues.saturation}
            on:input={handleInput('saturation')}
            on:change={handleChange('saturation')}
            class="w-full {isDisabled || isProcessing ? 'opacity-50' : ''}"
            disabled={isDisabled || isProcessing}
          />
        </div>
        <span class="text-sm w-12 text-right"
          >{displayValues.saturation.toFixed(1)}</span
        >
      </div>
    </label>

    <label class="slider-row">
      <span
        class="body-s"
        use:tooltip={{
          text: 'Adjust the image contrast',
          maxWidth: 'max-w-[200px]',
          position: 'right',
        }}
      >
        Contrast:
      </span>
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            type="range"
            min={HALFTONE_CONSTANTS.MIN_CONTRAST}
            max={HALFTONE_CONSTANTS.MAX_CONTRAST}
            step="0.1"
            value={displayValues.contrast}
            on:input={handleInput('contrast')}
            on:change={handleChange('contrast')}
            class="w-full {isDisabled || isProcessing ? 'opacity-50' : ''}"
            disabled={isDisabled || isProcessing}
          />
        </div>
        <span class="text-sm w-12 text-right"
          >{displayValues.contrast.toFixed(1)}</span
        >
      </div>
    </label>
  </div>

  <div class="flex flex-col gap-2">
    <div class="checkbox-container flex items-center gap-2 my-2">
      <div
        use:tooltip={{
          text: 'Automatically apply changes to the selection',
          position: 'right',
          maxWidth: 'max-w-[200px]',
        }}
      >
        <input
          id="realtimePreview"
          type="checkbox"
          bind:checked={realtimePreview}
          disabled={isDisabled || isProcessing}
          class="checkbox-input"
        />
        <label for="realtimePreview" class="text-sm"> Realtime </label>
      </div>
    </div>

    <button
      on:click={handleApplyEffect}
      data-appearance="primary"
      disabled={shouldDisableApply}
      class:opacity-50={realtimePreview}
      class="flex-1 flex justify-center gap-2 items-center"
      use:tooltip={{
        text: 'Apply a pixelated fill layer to the current shape',
        position: 'top',
        maxWidth: 'max-w-[300px]',
      }}
    >
      {realtimePreview ? 'Auto-applying changes' : 'Apply to shape'}
    </button>

    <button
      on:click={handleAddNewLayer}
      disabled={isDisabled || isProcessing}
      data-appearance="primary"
      class="flex-1 flex justify-center gap-2 items-center"
      use:tooltip={{
        text: 'Create a new shape with the pixelation effect',
        position: 'bottom',
        maxWidth: 'max-w-[300px]',
      }}
    >
      Create new Shape
    </button>
  </div>
</div>
