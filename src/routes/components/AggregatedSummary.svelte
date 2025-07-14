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
  import type { AggregatedSolarData } from '../multi-building';
  import { formatNumber } from '../utils';
  import Gauge from './Gauge.svelte';
  import SummaryCard from './SummaryCard.svelte';

  export let aggregatedData: AggregatedSolarData;
  export let monthlyAverageEnergyBill: number;
  export let energyCostPerKwh: number;
  export let dcToAcDerate: number;

  // Calculations based on aggregated data
  $: yearlyKwhEnergyConsumption = (monthlyAverageEnergyBill / energyCostPerKwh) * 12;
  $: yearlyEnergyProductionAcKwh = aggregatedData.totalYearlyEnergyDcKwh;
  $: energyCoverageRatio = yearlyEnergyProductionAcKwh / yearlyKwhEnergyConsumption;
  $: yearlySavings =
    Math.min(yearlyEnergyProductionAcKwh, yearlyKwhEnergyConsumption) * energyCostPerKwh;
  $: totalInstallationCost =
    aggregatedData.totalPanelsCount * aggregatedData.averagePanelCapacityWatts * 3.5; // Rough estimate
  $: paybackPeriodYears = totalInstallationCost / yearlySavings;

  function formatMoney(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatPercentage(value: number): string {
    return `${Math.round(value * 100)}%`;
  }
</script>

<div class="space-y-4">
  <!-- Header -->
  <div class="text-center">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Gesamtübersicht</h3>
    <p class="text-sm text-gray-600 dark:text-gray-400">
      {aggregatedData.buildings.length} Gebäude ausgewählt
    </p>
  </div>

  <!-- Key metrics -->
  <div class="grid grid-cols-2 gap-3">
    <SummaryCard
      icon="solar_power"
      title="Gesamt-Panels"
      rows={[{ name: 'Anzahl', value: formatNumber(aggregatedData.totalPanelsCount) }]}
    />
    <SummaryCard
      icon="bolt"
      title="Jahresproduktion"
      rows={[{ name: 'Energie', value: formatNumber(yearlyEnergyProductionAcKwh), units: 'kWh' }]}
    />
    <SummaryCard
      icon="euro"
      title="Jährliche Einsparung"
      rows={[{ name: 'Betrag', value: formatMoney(yearlySavings) }]}
    />
    <SummaryCard
      icon="timeline"
      title="Amortisationszeit"
      rows={[{ name: 'Jahre', value: Math.round(paybackPeriodYears).toString() }]}
    />
  </div>

  <!-- Energy coverage gauge -->
  <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
    <div class="text-center mb-3">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Energieabdeckung</h4>
    </div>

    <Gauge
      icon="battery_charging_full"
      title="Energieabdeckung"
      label={formatPercentage(Math.min(energyCoverageRatio, 1))}
      value={Math.min(energyCoverageRatio, 1)}
      labelSuffix={energyCoverageRatio > 1
        ? ` - Überschuss: ${formatNumber(yearlyEnergyProductionAcKwh - yearlyKwhEnergyConsumption)} kWh`
        : ' Ihres Verbrauchs'}
    />
  </div>

  <!-- Roof utilization -->
  <div class="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
    <div class="text-center mb-3">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Dachflächennutzung</h4>
    </div>

    <Gauge
      icon="roofing"
      title="Dachflächennutzung"
      label={formatNumber(aggregatedData.totalPanelsCount)}
      value={aggregatedData.totalPanelsCount / aggregatedData.totalMaxArrayPanelsCount}
      labelSuffix={` von ${formatNumber(aggregatedData.totalMaxArrayPanelsCount)} möglichen Panels`}
    />
  </div>

  <!-- Environmental impact -->
  <div
    class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700"
  >
    <div class="flex items-center space-x-2 mb-2">
      <md-icon class="text-green-600">eco</md-icon>
      <h4 class="text-sm font-medium text-green-800 dark:text-green-200">Umweltauswirkung</h4>
    </div>
    <div class="text-sm text-green-700 dark:text-green-300">
      <div class="flex justify-between">
        <span>CO₂-Einsparung pro Jahr:</span>
        <span class="font-medium">{formatNumber(aggregatedData.totalCarbonOffsetKgPerYear)} kg</span
        >
      </div>
      <div class="flex justify-between mt-1">
        <span>Gesamte Dachfläche:</span>
        <span class="font-medium">{formatNumber(aggregatedData.totalRoofArea)} m²</span>
      </div>
    </div>
  </div>

  <!-- Building breakdown -->
  {#if aggregatedData.buildings.length > 1}
    <div
      class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
    >
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Aufschlüsselung nach Gebäuden
      </h4>

      <div class="space-y-2">
        {#each aggregatedData.buildings as building}
          {@const config =
            building.buildingInsights.solarPotential.solarPanelConfigs[building.configId]}
          <div class="flex justify-between items-center text-xs">
            <span class="text-gray-600 dark:text-gray-400 truncate flex-1 mr-2">
              {building.nickname}
            </span>
            <div class="flex space-x-3 text-gray-700 dark:text-gray-300">
              <span>{formatNumber(config.panelsCount)} Panels</span>
              <span>{formatNumber(config.yearlyEnergyDcKwh * dcToAcDerate)} kWh</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  md-icon {
    --md-icon-size: 18px;
  }
</style>
