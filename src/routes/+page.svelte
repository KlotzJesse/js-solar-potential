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

  import * as GMAPILoader from '@googlemaps/js-api-loader';
  const { Loader } = GMAPILoader;

  import { onMount } from 'svelte';

  import SearchBar from './components/SearchBar.svelte';
  import type { SelectedBuilding } from './multi-building';
  import { MultiBuildingManager } from './multi-building';
  import Sections from './sections/Sections.svelte';

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Default values
  const fallbackPlace = {
    name: 'Rinconada Library',
    address: '1213 Newell Rd, Palo Alto, CA 94303',
  };

  // Reactive variables for URL params
  let defaultPlace = fallbackPlace;

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const name = urlParams.get('name');
    const address = urlParams.get('address');
    defaultPlace = {
      name: name || fallbackPlace.name,
      address: address || fallbackPlace.address,
    };
  });

  let location: google.maps.LatLng | undefined;
  const zoom = 18;

  // Multi-building management
  let buildingManager: MultiBuildingManager;
  let selectedBuildings: SelectedBuilding[] = [];
  let selectedBuildingId: string | null = null;

  // Initialize building manager
  onMount(() => {
    buildingManager = new MultiBuildingManager((buildings) => {
      selectedBuildings = buildings;
    });
  });

  // Initialize app.
  let mapElement: HTMLElement;
  let map: google.maps.Map;
  let geometryLibrary: google.maps.GeometryLibrary;
  let mapsLibrary: google.maps.MapsLibrary;
  let placesLibrary: google.maps.PlacesLibrary;

  onMount(async () => {
    // Load the Google Maps libraries.
    const loader = new Loader({ apiKey: googleMapsApiKey });
    const libraries = {
      geometry: loader.importLibrary('geometry'),
      maps: loader.importLibrary('maps'),
      places: loader.importLibrary('places'),
    };
    geometryLibrary = await libraries.geometry;
    mapsLibrary = await libraries.maps;
    placesLibrary = await libraries.places;

    // Get the address information for the default location.
    const geocoder = new google.maps.Geocoder();
    const geocoderResponse = await geocoder.geocode({
      address: defaultPlace.address,
    });
    const geocoderResult = geocoderResponse.results[0];

    // Initialize the map at the desired location.
    location = geocoderResult.geometry.location;
    map = new mapsLibrary.Map(mapElement, {
      center: location,
      zoom: zoom,
      tilt: 0,
      mapTypeId: 'hybrid',
      mapTypeControl: false,
      fullscreenControl: true,
      rotateControl: false,
      streetViewControl: false,
      zoomControl: true,
    });

    // Add a click listener to the map - automatically add buildings to multi-selection
    map.addListener('click', async (event: google.maps.MapMouseEvent) => {
      if (event.latLng && buildingManager) {
        const clickedLocation = event.latLng;

        // Check if there's already a building at this location
        const existingBuildingId = buildingManager.hasBuilding(clickedLocation, 0.0001);

        if (existingBuildingId) {
          // Select the existing building
          selectedBuildingId = existingBuildingId;
          map.setCenter(clickedLocation);
        } else {
          // Add new building automatically
          try {
            // Reverse geocode the clicked location
            const geocoderResponse = await geocoder.geocode({
              location: clickedLocation,
            });

            if (geocoderResponse.results.length > 0) {
              const address = geocoderResponse.results[0].formatted_address;

              // Try to get building insights and add to manager
              try {
                const { findClosestBuilding } = await import('./solar');
                const buildingInsights = await findClosestBuilding(
                  clickedLocation,
                  googleMapsApiKey,
                );

                const buildingId = buildingManager.addBuilding(
                  buildingInsights,
                  clickedLocation,
                  address,
                  0, // Default config
                );

                selectedBuildingId = buildingId;

                // Create and store panels for this building
                const { createPalette, normalize, rgbToColor } = await import('./visualize');
                const { panelsPalette } = await import('./colors');

                const solarPotential = buildingInsights.solarPotential;
                const palette = createPalette(panelsPalette).map(rgbToColor);
                const minEnergy = solarPotential.solarPanels.slice(-1)[0]?.yearlyEnergyDcKwh || 0;
                const maxEnergy = solarPotential.solarPanels[0]?.yearlyEnergyDcKwh || 0;

                const panels = solarPotential.solarPanels.map((panel) => {
                  const [w, h] = [
                    solarPotential.panelWidthMeters / 2,
                    solarPotential.panelHeightMeters / 2,
                  ];
                  const points = [
                    { x: +w, y: +h }, // top right
                    { x: +w, y: -h }, // bottom right
                    { x: -w, y: -h }, // bottom left
                    { x: -w, y: +h }, // top left
                    { x: +w, y: +h }, //  top right
                  ];
                  const orientation = panel.orientation == 'PORTRAIT' ? 90 : 0;
                  const azimuth =
                    solarPotential.roofSegmentStats[panel.segmentIndex]?.azimuthDegrees || 0;
                  const colorIndex = Math.round(
                    normalize(panel.yearlyEnergyDcKwh, maxEnergy, minEnergy) * 255,
                  );
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
                    map: showPanels ? map : null,
                  });
                });

                buildingManager.setBuildingPanels(buildingId, panels);

                // Create boundary polygon for the building
                if (buildingInsights.boundingBox) {
                  const bbox = buildingInsights.boundingBox;
                  const boundary = new google.maps.Polygon({
                    paths: [
                      { lat: bbox.sw.latitude, lng: bbox.sw.longitude },
                      { lat: bbox.ne.latitude, lng: bbox.sw.longitude },
                      { lat: bbox.ne.latitude, lng: bbox.ne.longitude },
                      { lat: bbox.sw.latitude, lng: bbox.ne.longitude },
                    ],
                    strokeColor: '#2196F3',
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: '#2196F3',
                    fillOpacity: 0.1,
                    map: map,
                  });
                  buildingManager.setBuildingBoundary(buildingId, boundary);
                }

                console.log('Added building:', address);
              } catch (error) {
                console.warn('Could not get building insights for this location:', error);
                // Still update location for manual inspection in building insights section
              }

              // Update current location for the BuildingInsights section
              location = clickedLocation;
              map.setCenter(clickedLocation);
              defaultPlace = {
                name: address,
                address: address,
              };
            }
          } catch (error) {
            console.warn('Could not add building at this location:', error);
            // Still update location for manual inspection
            location = clickedLocation;
            map.setCenter(clickedLocation);
          }
        }
      }
    });
  });
</script>

<!-- Top bar -->
<div class="flex flex-row h-full">
  <!-- Main map -->
  <div bind:this={mapElement} class="w-full"></div>

  <!-- Side bar -->
  <aside class="flex-none p-2 pt-3 overflow-auto w-60">
    <div class="flex flex-col h-full space-y-2">
      {#if placesLibrary && map}
        <SearchBar bind:location {placesLibrary} {map} initialValue={defaultPlace.name} />
      {/if}

      {#if location}
        <Sections
          {location}
          {map}
          {geometryLibrary}
          {googleMapsApiKey}
          {buildingManager}
          {selectedBuildings}
          {selectedBuildingId}
        />
      {/if}

      <div class="grow"></div>
    </div>
  </aside>
</div>
