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
  /* global google */

  import type { MdDialog } from '@material/web/dialog/dialog';
  import { panelsPalette } from '../colors';
  import Expandable from '../components/Expandable.svelte';
  import Gauge from '../components/Gauge.svelte';
  import InputBool from '../components/InputBool.svelte';
  import NumberInput from '../components/InputNumber.svelte';
  import InputPanelsCount from '../components/InputPanelsCount.svelte';
  import Show from '../components/Show.svelte';
  import SummaryCard from '../components/SummaryCard.svelte';
  import type { MultiBuildingManager } from '../multi-building';
  import {
    findClosestBuilding,
    type BuildingInsightsResponse,
    type RequestError,
    type SolarPanelConfig,
  } from '../solar';
  import { convertYourDateToNativeJSDate, formatNativeDate, showNumber } from '../utils';
  import { createPalette, normalize, rgbToColor } from '../visualize';

  export let expandedSection: string;
  export let buildingInsights: BuildingInsightsResponse | undefined;
  export let configId: number | undefined;
  export let panelCapacityWatts: number;
  export let showPanels: boolean = true;

  export let googleMapsApiKey: string;
  export let geometryLibrary: google.maps.GeometryLibrary;
  export let location: google.maps.LatLng;
  export let map: google.maps.Map;
  export let buildingManager: MultiBuildingManager;
  export let currentAddress: string;

  const icon = 'home';
  const title = 'Gebäudeübersicht';

  let requestSent = false;
  let requestError: RequestError | undefined;
  let apiResponseDialog: MdDialog;

  let panelConfig: SolarPanelConfig | undefined;
  $: if (buildingInsights && configId !== undefined) {
    panelConfig = buildingInsights.solarPotential.solarPanelConfigs[configId];
  }

  let solarPanels: google.maps.Polygon[] = [];
  $: solarPanels.map((panel, i) =>
    panel.setMap(showPanels && panelConfig && i < panelConfig.panelsCount ? map : null),
  );

  let panelCapacityRatio = 1.0;
  $: if (buildingInsights) {
    const defaultPanelCapacity = buildingInsights.solarPotential.panelCapacityWatts;
    panelCapacityRatio = panelCapacityWatts / defaultPanelCapacity;
  }

  export async function showSolarPotential(location: google.maps.LatLng) {
    if (requestSent) {
      return;
    }

    console.log('showSolarPotential');
    buildingInsights = undefined;
    requestError = undefined;

    solarPanels.map((panel) => panel.setMap(null));
    solarPanels = [];

    requestSent = true;
    try {
      buildingInsights = await findClosestBuilding(location, googleMapsApiKey);
    } catch (e) {
      requestError = e as RequestError;
      return;
    } finally {
      requestSent = false;
    }

    // Create the solar panels on the map.
    const solarPotential = buildingInsights.solarPotential;
    const palette = createPalette(panelsPalette).map(rgbToColor);
    const minEnergy = solarPotential.solarPanels.slice(-1)[0].yearlyEnergyDcKwh;
    const maxEnergy = solarPotential.solarPanels[0].yearlyEnergyDcKwh;
    solarPanels = solarPotential.solarPanels.map((panel) => {
      const [w, h] = [solarPotential.panelWidthMeters / 2, solarPotential.panelHeightMeters / 2];
      const points = [
        { x: +w, y: +h }, // top right
        { x: +w, y: -h }, // bottom right
        { x: -w, y: -h }, // bottom left
        { x: -w, y: +h }, // top left
        { x: +w, y: +h }, //  top right
      ];
      const orientation = panel.orientation == 'PORTRAIT' ? 90 : 0;
      const azimuth = solarPotential.roofSegmentStats[panel.segmentIndex].azimuthDegrees;
      const colorIndex = Math.round(normalize(panel.yearlyEnergyDcKwh, maxEnergy, minEnergy) * 255);
      return new google.maps.Polygon({
        paths: points.map(({ x, y }) =>
          geometryLibrary.spherical.computeOffset(
            { lat: panel.center.latitude, lng: panel.center.longitude },
            Math.sqrt(x * x + y * y),
            Math.atan2(y, x) * (180 / Math.PI) + orientation + azimuth,
          ),
        ),
        strokeColor: '#B0BEC5',
        strokeOpacity: 0.9,
        strokeWeight: 1,
        fillColor: palette[colorIndex],
        fillOpacity: 0.9,
      });
    });
  }

  $: showSolarPotential(location);
</script>

{#if requestError}
  <div class="error-container on-error-container-text">
    <Expandable section={title} icon="error" {title} subtitle={requestError.error.status}>
      <div class="grid py-2 space-y-4 place-items-center">
        <div class="grid place-items-center">
          <p class="body-small">
            Fehler bei <code>buildingInsights</code> Anfrage
          </p>
          <p class="title-large">ERROR {requestError.error.code}</p>
          <p class="body-small"><code>{requestError.error.status}</code></p>
          <p class="label-medium">{requestError.error.message}</p>
        </div>
        <md-filled-button role={undefined} on:click={() => showSolarPotential(location)}>
          Erneut probieren
          <md-icon slot="icon">refresh</md-icon>
        </md-filled-button>
      </div>
    </Expandable>
  </div>
{:else if !buildingInsights}
  <div class="grid py-8 place-items-center">
    <md-circular-progress four-color indeterminate />
  </div>
{:else if configId !== undefined && panelConfig}
  <Expandable
    bind:section={expandedSection}
    {icon}
    {title}
    subtitle={`Jährlicher Energieverbrauch: ${(
      (panelConfig.yearlyEnergyDcKwh * panelCapacityRatio) /
      1000
    ).toFixed(2)} MWh`}
  >
    <div class="flex flex-col px-2 space-y-2">
      <InputPanelsCount
        bind:configId
        solarPanelConfigs={buildingInsights.solarPotential.solarPanelConfigs}
      />
      <NumberInput
        bind:value={panelCapacityWatts}
        icon="bolt"
        label="Panel-Kapazität"
        suffix="Watt"
      />
      <InputBool bind:value={showPanels} label="Solarplatten" />

      <div class="grid justify-items-end">
        <md-filled-tonal-button role={undefined} on:click={() => apiResponseDialog.show()}>
          API Antwort
        </md-filled-tonal-button>
      </div>

      <md-dialog bind:this={apiResponseDialog}>
        <div slot="headline">
          <div class="flex items-center primary-text">
            <md-icon>{icon}</md-icon>
            <b>&nbsp;{title}</b>
          </div>
        </div>
        <div slot="content">
          <Show value={buildingInsights} label="buildingInsightsResponse" />
        </div>
        <div slot="actions">
          <md-text-button role={undefined} on:click={() => apiResponseDialog.close()}>
            Schließen
          </md-text-button>
        </div>
      </md-dialog>
    </div>
  </Expandable>

  {#if expandedSection == title}
    <div class="absolute top-0 left-0 w-56">
      <div class="flex flex-col m-2 space-y-2">
        <SummaryCard
          {icon}
          {title}
          rows={[
            {
              icon: 'wb_sunny',
              name: 'Jährlicher Sonnenschein',
              value: showNumber(buildingInsights.solarPotential.maxSunshineHoursPerYear),
              units: 'Stunden',
            },
            {
              icon: 'square_foot',
              name: 'Dachfläche',
              value: showNumber(buildingInsights.solarPotential.wholeRoofStats.areaMeters2),
              units: 'm²',
            },
            {
              icon: 'solar_power',
              name: 'Maximale Plattenanzahl',
              value: showNumber(buildingInsights.solarPotential.solarPanels.length),
              units: 'Solarplatten',
            },
            {
              icon: 'co2',
              name: 'CO₂ Einsparungen',
              value: showNumber(buildingInsights.solarPotential.carbonOffsetFactorKgPerMwh),
              units: 'Kg/MWh',
            },
            {
              icon: 'history',
              name: 'Bearbeitet am',
              value: formatNativeDate(
                convertYourDateToNativeJSDate(buildingInsights.imageryProcessedDate),
                'de-DE',
                { year: 'numeric', month: '2-digit', day: '2-digit' },
              ),
              units: '',
            },
            {
              icon: 'camera',
              name: 'Bild vom',
              value: formatNativeDate(
                convertYourDateToNativeJSDate(buildingInsights.imageryDate),
                'de-DE',
                { year: 'numeric', month: '2-digit', day: '2-digit' },
              ),
              units: '',
            },
          ]}
        />

        <div class="w-full p-4 rounded-lg shadow-md surface on-surface-text">
          <div class="flex justify-around">
            <Gauge
              icon="solar_power"
              title="Solarplatten Anzahl"
              label={showNumber(panelConfig.panelsCount)}
              labelSuffix={`/ ${showNumber(solarPanels.length)}`}
              max={solarPanels.length}
              value={panelConfig.panelsCount}
            />

            <Gauge
              icon="energy_savings_leaf"
              title="Jährliche Energie"
              label={showNumber((panelConfig?.yearlyEnergyDcKwh ?? 0) * panelCapacityRatio)}
              labelSuffix="KWh"
              max={buildingInsights.solarPotential.solarPanelConfigs.slice(-1)[0]
                .yearlyEnergyDcKwh * panelCapacityRatio}
              value={panelConfig.yearlyEnergyDcKwh * panelCapacityRatio}
            />
          </div>
        </div>
      </div>
    </div>
  {/if}
{/if}
