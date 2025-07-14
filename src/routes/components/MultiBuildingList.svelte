<!--
 Copyright 2023 Google LLC

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 -->

<script lang="ts">
  import type { SelectedBuilding } from '../multi-building';
  import { formatNumber } from '../utils';

  export let buildings: SelectedBuilding[] = [];
  export let onRemoveBuilding: (id: string) => void;
  export let onToggleBuilding: (id: string) => void;
  export let onEditNickname: (id: string, nickname: string) => void;
  export let onSelectBuilding: (id: string) => void;
  export let selectedBuildingId: string | null = null;

  let editingNickname: string | null = null;
  let tempNickname = '';

  function startEditNickname(building: SelectedBuilding) {
    editingNickname = building.id;
    tempNickname = building.nickname || '';
  }

  function saveNickname(id: string) {
    onEditNickname(id, tempNickname);
    editingNickname = null;
  }

  function cancelEdit() {
    editingNickname = null;
    tempNickname = '';
  }

  function handleKeydown(event: KeyboardEvent, id: string) {
    if (event.key === 'Enter') {
      saveNickname(id);
    } else if (event.key === 'Escape') {
      cancelEdit();
    }
  }

  function getEnergyDisplay(building: SelectedBuilding): string {
    const config = building.buildingInsights.solarPotential.solarPanelConfigs[building.configId];
    return formatNumber(config.yearlyEnergyDcKwh);
  }

  function getPanelsDisplay(building: SelectedBuilding): string {
    const config = building.buildingInsights.solarPotential.solarPanelConfigs[building.configId];
    return formatNumber(config.panelsCount);
  }
</script>

<div class="space-y-2">
  <div class="flex items-center justify-between">
    <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
      Ausgewählte Gebäude ({buildings.length})
    </h3>
    {#if buildings.length > 0}
      <span class="text-xs text-gray-500">
        {buildings.filter((b) => b.isActive).length} aktiv
      </span>
    {/if}
  </div>

  {#if buildings.length === 0}
    <div class="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
      Klicken Sie auf die Karte, um Gebäude hinzuzufügen
    </div>
  {:else}
    <div class="space-y-1 max-h-64 overflow-y-auto">
      {#each buildings as building (building.id)}
        <div
          class="border rounded-lg p-2 text-xs {building.isActive
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
            : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-600'} {selectedBuildingId ===
          building.id
            ? 'ring-2 ring-blue-400'
            : ''}"
          role="button"
          tabindex="0"
          on:click={() => onSelectBuilding(building.id)}
          on:keydown={(e) => e.key === 'Enter' && onSelectBuilding(building.id)}
        >
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              {#if editingNickname === building.id}
                <div class="flex items-center space-x-1">
                  <input
                    type="text"
                    bind:value={tempNickname}
                    on:keydown={(e) => handleKeydown(e, building.id)}
                    on:blur={() => saveNickname(building.id)}
                    class="text-xs bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 flex-1 min-w-0"
                    autofocus
                  />
                  <button
                    on:click|stopPropagation={() => saveNickname(building.id)}
                    class="text-green-600 hover:text-green-700"
                    title="Speichern"
                  >
                    <md-icon>check</md-icon>
                  </button>
                  <button
                    on:click|stopPropagation={cancelEdit}
                    class="text-gray-500 hover:text-gray-600"
                    title="Abbrechen"
                  >
                    <md-icon>close</md-icon>
                  </button>
                </div>
              {:else}
                <div class="flex items-center space-x-1">
                  <button
                    on:click|stopPropagation={() => onToggleBuilding(building.id)}
                    class="flex-shrink-0"
                    title={building.isActive ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    <md-icon
                      class="text-base {building.isActive ? 'text-green-600' : 'text-gray-400'}"
                    >
                      {building.isActive ? 'check_circle' : 'radio_button_unchecked'}
                    </md-icon>
                  </button>
                  <span
                    class="font-medium truncate cursor-pointer hover:text-blue-600 {building.isActive
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-500 dark:text-gray-400'}"
                    on:click|stopPropagation={() => startEditNickname(building)}
                    title="Klicken zum Bearbeiten"
                  >
                    {building.nickname}
                  </span>
                  <button
                    on:click|stopPropagation={() => startEditNickname(building)}
                    class="text-gray-400 hover:text-gray-600 flex-shrink-0"
                    title="Name bearbeiten"
                  >
                    <md-icon class="text-sm">edit</md-icon>
                  </button>
                </div>
              {/if}

              <div class="text-gray-600 dark:text-gray-400 truncate mt-1" title={building.address}>
                {building.address}
              </div>

              {#if building.isActive}
                <div class="flex justify-between mt-1 text-gray-600 dark:text-gray-400">
                  <span>{getPanelsDisplay(building)} Panels</span>
                  <span>{getEnergyDisplay(building)} kWh/Jahr</span>
                </div>
              {/if}
            </div>

            <button
              on:click|stopPropagation={() => onRemoveBuilding(building.id)}
              class="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
              title="Gebäude entfernen"
            >
              <md-icon class="text-base">delete</md-icon>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  md-icon {
    --md-icon-size: 16px;
  }
</style>
