/*
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
 */

export interface SelectedBuilding {
  id: string;
  buildingInsights: BuildingInsightsResponse;
  configId: number;
  location: google.maps.LatLng;
  address: string;
  nickname?: string;
  boundary?: google.maps.Polygon;
  panels: google.maps.Polygon[];
  isActive: boolean;
}

export interface AggregatedSolarData {
  totalPanelsCount: number;
  totalYearlyEnergyDcKwh: number;
  totalAreaMeters2: number;
  totalMaxArrayPanelsCount: number;
  totalMaxArrayAreaMeters2: number;
  totalRoofArea: number;
  buildings: SelectedBuilding[];
  averagePanelCapacityWatts: number;
  totalCarbonOffsetKgPerYear: number;
}

export class MultiBuildingManager {
  private buildings: Map<string, SelectedBuilding> = new Map();
  private onUpdateCallback?: (buildings: SelectedBuilding[]) => void;

  constructor(onUpdate?: (buildings: SelectedBuilding[]) => void) {
    this.onUpdateCallback = onUpdate;
  }

  addBuilding(
    buildingInsights: BuildingInsightsResponse,
    location: google.maps.LatLng,
    address: string,
    configId: number = 0,
    nickname?: string,
  ): string {
    const id = this.generateId(location);
    const building: SelectedBuilding = {
      id,
      buildingInsights,
      configId,
      location,
      address,
      nickname: nickname || this.generateNickname(address),
      boundary: undefined,
      panels: [],
      isActive: true,
    };

    this.buildings.set(id, building);
    this.notifyUpdate();
    return id;
  }

  removeBuilding(id: string): boolean {
    const building = this.buildings.get(id);
    if (building) {
      // Clean up map objects
      building.boundary?.setMap(null);
      building.panels.forEach((panel) => panel.setMap(null));
      this.buildings.delete(id);
      this.notifyUpdate();
      return true;
    }
    return false;
  }

  updateBuildingConfig(id: string, configId: number): boolean {
    const building = this.buildings.get(id);
    if (building) {
      building.configId = configId;
      this.notifyUpdate();
      return true;
    }
    return false;
  }

  updateBuildingNickname(id: string, nickname: string): boolean {
    const building = this.buildings.get(id);
    if (building) {
      building.nickname = nickname;
      this.notifyUpdate();
      return true;
    }
    return false;
  }

  toggleBuildingActive(id: string): boolean {
    const building = this.buildings.get(id);
    if (building) {
      building.isActive = !building.isActive;
      this.notifyUpdate();
      return true;
    }
    return false;
  }

  setBuildingPanels(id: string, panels: google.maps.Polygon[]): boolean {
    const building = this.buildings.get(id);
    if (building) {
      building.panels = panels;
      return true;
    }
    return false;
  }

  setBuildingBoundary(id: string, boundary: google.maps.Polygon): boolean {
    const building = this.buildings.get(id);
    if (building) {
      building.boundary = boundary;
      return true;
    }
    return false;
  }

  getBuilding(id: string): SelectedBuilding | undefined {
    return this.buildings.get(id);
  }

  getAllBuildings(): SelectedBuilding[] {
    return Array.from(this.buildings.values());
  }

  getActiveBuildings(): SelectedBuilding[] {
    return Array.from(this.buildings.values()).filter((b) => b.isActive);
  }

  hasBuilding(location: google.maps.LatLng, threshold: number = 0.0001): string | null {
    for (const [id, building] of this.buildings) {
      // Simple distance calculation without Google Maps API (for testing)
      const latDiff = Math.abs(location.lat() - building.location.lat());
      const lngDiff = Math.abs(location.lng() - building.location.lng());
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

      if (distance < threshold) {
        return id;
      }
    }
    return null;
  }

  getAggregatedData(
    panelCapacityRatio: number = 1.0,
    dcToAcDerate: number = 0.85,
  ): AggregatedSolarData {
    const activeBuildings = this.getActiveBuildings();

    let totalPanelsCount = 0;
    let totalYearlyEnergyDcKwh = 0;
    let totalAreaMeters2 = 0;
    let totalMaxArrayPanelsCount = 0;
    let totalMaxArrayAreaMeters2 = 0;
    let totalRoofArea = 0;
    let totalCarbonOffset = 0;
    let totalPanelCapacity = 0;

    for (const building of activeBuildings) {
      const config = building.buildingInsights.solarPotential.solarPanelConfigs[building.configId];
      const solarPotential = building.buildingInsights.solarPotential;

      totalPanelsCount += Math.floor(config.panelsCount * panelCapacityRatio);
      totalYearlyEnergyDcKwh += config.yearlyEnergyDcKwh * panelCapacityRatio * dcToAcDerate;
      totalMaxArrayPanelsCount += solarPotential.maxArrayPanelsCount;
      totalMaxArrayAreaMeters2 += solarPotential.maxArrayAreaMeters2;
      totalRoofArea += solarPotential.wholeRoofStats.areaMeters2;
      totalCarbonOffset +=
        (config.yearlyEnergyDcKwh *
          panelCapacityRatio *
          dcToAcDerate *
          solarPotential.carbonOffsetFactorKgPerMwh) /
        1000;
      totalPanelCapacity += solarPotential.panelCapacityWatts;
    }

    totalAreaMeters2 = totalPanelsCount * 2; // Approximate panel area

    return {
      totalPanelsCount,
      totalYearlyEnergyDcKwh,
      totalAreaMeters2,
      totalMaxArrayPanelsCount,
      totalMaxArrayAreaMeters2,
      totalRoofArea,
      buildings: activeBuildings,
      averagePanelCapacityWatts:
        activeBuildings.length > 0 ? totalPanelCapacity / activeBuildings.length : 0,
      totalCarbonOffsetKgPerYear: totalCarbonOffset,
    };
  }

  clear(): void {
    // Clean up all map objects
    for (const building of this.buildings.values()) {
      building.boundary?.setMap(null);
      building.panels.forEach((panel) => panel.setMap(null));
    }
    this.buildings.clear();
    this.notifyUpdate();
  }

  private generateId(location: google.maps.LatLng): string {
    return `building_${location.lat().toFixed(6)}_${location.lng().toFixed(6)}_${Date.now()}`;
  }

  private generateNickname(address: string): string {
    // Extract building number or first meaningful part of address
    const parts = address.split(',')[0].trim();
    const match = parts.match(/(\d+[a-zA-Z]?)/);
    return match ? `Gebäude ${match[1]}` : 'Gebäude';
  }

  private notifyUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.getAllBuildings());
    }
  }
}
