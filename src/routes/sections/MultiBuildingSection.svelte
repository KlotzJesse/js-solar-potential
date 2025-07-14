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
  import AggregatedSummary from '../components/AggregatedSummary.svelte';
  import Expandable from '../components/Expandable.svelte';
  import InputBool from '../components/InputBool.svelte';
  import MultiBuildingList from '../components/MultiBuildingList.svelte';
  import type { MultiBuildingManager, SelectedBuilding } from '../multi-building';

  export let expandedSection: string;
  export let showPanels: boolean;
  export let monthlyAverageEnergyBillInput: number;
  export let energyCostPerKwhInput: number;
  export let panelCapacityWattsInput: number;
  export let dcToAcDerateInput: number;
  export let buildingManager: MultiBuildingManager;
  export let selectedBuildings: SelectedBuilding[];
  export let selectedBuildingId: string | null;
  export let map: google.maps.Map;

  const icon = 'domain';
  const title = 'Multi-Gebäude';

  // Calculate panel capacity ratio
  let panelCapacityRatio = 1.0;
  $: if (selectedBuildings.length > 0) {
    const avgDefaultCapacity =
      selectedBuildings.reduce(
        (sum, building) => sum + building.buildingInsights.solarPotential.panelCapacityWatts,
        0,
      ) / selectedBuildings.length;
    panelCapacityRatio = panelCapacityWattsInput / avgDefaultCapacity;
  }

  // Get aggregated data
  $: aggregatedData = buildingManager?.getAggregatedData(panelCapacityRatio, dcToAcDerateInput) || {
    totalPanelsCount: 0,
    totalYearlyEnergyDcKwh: 0,
    totalAreaMeters2: 0,
    totalMaxArrayPanelsCount: 0,
    totalMaxArrayAreaMeters2: 0,
    totalRoofArea: 0,
    buildings: [],
    averagePanelCapacityWatts: 0,
    totalCarbonOffsetKgPerYear: 0,
  };

  // Handle panel visibility changes
  $: if (selectedBuildings && map) {
    selectedBuildings.forEach((building) => {
      building.panels.forEach((panel, i) => {
        const config =
          building.buildingInsights.solarPotential.solarPanelConfigs[building.configId];
        const shouldShow =
          showPanels &&
          building.isActive &&
          i < Math.floor(config.panelsCount * panelCapacityRatio);
        panel.setMap(shouldShow ? map : null);
      });
    });
  }

  function handleRemoveBuilding(id: string) {
    buildingManager?.removeBuilding(id);
  }

  function handleToggleBuilding(id: string) {
    buildingManager?.toggleBuildingActive(id);
  }

  function handleEditNickname(id: string, nickname: string) {
    buildingManager?.updateBuildingNickname(id, nickname);
  }

  function handleSelectBuilding(id: string) {
    selectedBuildingId = id;
    const building = buildingManager?.getBuilding(id);
    if (building && map) {
      map.setCenter(building.location);
      map.setZoom(20);
    }
  }

  function clearAllBuildings() {
    buildingManager?.clear();
  }
</script>

<Expandable bind:section={expandedSection} {title} {icon}>
  <div class="space-y-4">
    <!-- Controls -->
    <div class="flex items-center justify-between">
      <InputBool label="Panels anzeigen" bind:value={showPanels} />
      {#if selectedBuildings.length > 0}
        <button
          on:click={clearAllBuildings}
          class="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          title="Alle Gebäude entfernen"
        >
          Alle löschen
        </button>
      {/if}
    </div>

    <!-- Building list -->
    <MultiBuildingList
      buildings={selectedBuildings}
      {selectedBuildingId}
      onRemoveBuilding={handleRemoveBuilding}
      onToggleBuilding={handleToggleBuilding}
      onEditNickname={handleEditNickname}
      onSelectBuilding={handleSelectBuilding}
    />

    <!-- Aggregated summary -->
    {#if selectedBuildings.length > 0 && aggregatedData.buildings.filter((b) => b.isActive).length > 0}
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <AggregatedSummary
          {aggregatedData}
          monthlyAverageEnergyBill={monthlyAverageEnergyBillInput}
          energyCostPerKwh={energyCostPerKwhInput}
          dcToAcDerate={dcToAcDerateInput}
        />
      </div>
    {/if}

    <!-- Instructions -->
    {#if selectedBuildings.length === 0}
      <div
        class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700"
      >
        <div class="flex items-start space-x-2">
          <md-icon class="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5">info</md-icon>
          <div class="text-sm text-blue-800 dark:text-blue-200">
            <p class="font-medium mb-1">Gebäude auswählen</p>
            <p>
              Klicken Sie auf Gebäude auf der Karte, um sie automatisch zu Ihrer Auswahl
              hinzuzufügen und deren Solarpotential zu analysieren.
            </p>
          </div>
        </div>
      </div>
    {:else}
      <div
        class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700"
      >
        <div class="flex items-start space-x-2">
          <md-icon class="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
            >check_circle</md-icon
          >
          <div class="text-sm text-green-800 dark:text-green-200">
            <p class="font-medium mb-1">{selectedBuildings.length} Gebäude ausgewählt</p>
            <p>
              Klicken Sie weitere Gebäude auf der Karte an, um sie hinzuzufügen, oder verwenden Sie
              die Steuerelemente unten zur Verwaltung.
            </p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</Expandable>

<style>
  md-icon {
    --md-icon-size: 16px;
  }
</style>
