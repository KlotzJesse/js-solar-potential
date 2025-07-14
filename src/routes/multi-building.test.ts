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

import { describe, expect, it } from 'vitest';
import { MultiBuildingManager } from './multi-building';
import type { BuildingInsightsResponse } from './solar';

// Mock Google Maps objects
const mockLatLng1 = {
  lat: () => 37.4419,
  lng: () => -122.143,
} as google.maps.LatLng;

const mockLatLng2 = {
  lat: () => 37.442,
  lng: () => -122.1431,
} as google.maps.LatLng;

const mockBuildingInsights: BuildingInsightsResponse = {
  name: 'Test Building',
  center: { latitude: 37.4419, longitude: -122.143 },
  boundingBox: {
    sw: { latitude: 37.4418, longitude: -122.1431 },
    ne: { latitude: 37.442, longitude: -122.1429 },
  },
  imageryDate: { year: 2023, month: 6, day: 15 },
  imageryProcessedDate: { year: 2023, month: 7, day: 1 },
  postalCode: '94301',
  administrativeArea: 'CA',
  statisticalArea: 'US',
  regionCode: 'US',
  solarPotential: {
    maxArrayPanelsCount: 100,
    panelCapacityWatts: 400,
    panelHeightMeters: 2,
    panelWidthMeters: 1,
    panelLifetimeYears: 25,
    maxArrayAreaMeters2: 200,
    maxSunshineHoursPerYear: 2000,
    carbonOffsetFactorKgPerMwh: 428,
    wholeRoofStats: {
      areaMeters2: 250,
      sunshineQuantiles: [1800, 1900, 2000],
      groundAreaMeters2: 250,
    },
    buildingStats: {
      areaMeters2: 250,
      sunshineQuantiles: [1800, 1900, 2000],
      groundAreaMeters2: 250,
    },
    roofSegmentStats: [],
    solarPanels: [],
    solarPanelConfigs: [
      {
        panelsCount: 50,
        yearlyEnergyDcKwh: 20000,
        roofSegmentSummaries: [],
      },
      {
        panelsCount: 75,
        yearlyEnergyDcKwh: 30000,
        roofSegmentSummaries: [],
      },
      {
        panelsCount: 100,
        yearlyEnergyDcKwh: 40000,
        roofSegmentSummaries: [],
      },
    ],
    financialAnalyses: {},
  },
  imageryQuality: 'HIGH',
};

describe('MultiBuildingManager', () => {
  it('should add buildings correctly', () => {
    const manager = new MultiBuildingManager();

    const buildingId = manager.addBuilding(
      mockBuildingInsights,
      mockLatLng1,
      'Test Address 123',
      0,
      'Test Building 1',
    );

    expect(buildingId).toBeDefined();
    expect(manager.getAllBuildings()).toHaveLength(1);

    const building = manager.getBuilding(buildingId);
    expect(building?.nickname).toBe('Test Building 1');
    expect(building?.address).toBe('Test Address 123');
    expect(building?.isActive).toBe(true);
  });

  it('should generate unique IDs for buildings', () => {
    const manager = new MultiBuildingManager();

    const id1 = manager.addBuilding(mockBuildingInsights, mockLatLng1, 'Address 1');
    const id2 = manager.addBuilding(mockBuildingInsights, mockLatLng2, 'Address 2');

    expect(id1).not.toBe(id2);
    expect(manager.getAllBuildings()).toHaveLength(2);
  });

  it('should remove buildings correctly', () => {
    const manager = new MultiBuildingManager();

    const buildingId = manager.addBuilding(mockBuildingInsights, mockLatLng1, 'Test Address');
    expect(manager.getAllBuildings()).toHaveLength(1);

    const removed = manager.removeBuilding(buildingId);
    expect(removed).toBe(true);
    expect(manager.getAllBuildings()).toHaveLength(0);
  });

  it('should toggle building active status', () => {
    const manager = new MultiBuildingManager();

    const buildingId = manager.addBuilding(mockBuildingInsights, mockLatLng1, 'Test Address');
    const building = manager.getBuilding(buildingId);

    expect(building?.isActive).toBe(true);

    manager.toggleBuildingActive(buildingId);
    expect(manager.getBuilding(buildingId)?.isActive).toBe(false);

    manager.toggleBuildingActive(buildingId);
    expect(manager.getBuilding(buildingId)?.isActive).toBe(true);
  });

  it('should update building nicknames', () => {
    const manager = new MultiBuildingManager();

    const buildingId = manager.addBuilding(mockBuildingInsights, mockLatLng1, 'Test Address');

    manager.updateBuildingNickname(buildingId, 'New Nickname');
    expect(manager.getBuilding(buildingId)?.nickname).toBe('New Nickname');
  });

  it('should calculate aggregated data correctly', () => {
    const manager = new MultiBuildingManager();

    // Add two buildings with different configs
    const id1 = manager.addBuilding(mockBuildingInsights, mockLatLng1, 'Building 1', 0); // 50 panels
    const id2 = manager.addBuilding(mockBuildingInsights, mockLatLng2, 'Building 2', 1); // 75 panels

    // Verify buildings were added correctly
    const building1 = manager.getBuilding(id1);
    const building2 = manager.getBuilding(id2);
    expect(building1?.configId).toBe(0);
    expect(building2?.configId).toBe(1);

    const aggregatedData = manager.getAggregatedData(1.0, 0.85);

    // Expected: Building1 config 0 = 50 panels, Building2 config 1 = 75 panels
    expect(aggregatedData.totalPanelsCount).toBe(125); // 50 + 75
    expect(aggregatedData.totalYearlyEnergyDcKwh).toBe(42500); // (20000 + 30000) * 0.85
    expect(aggregatedData.buildings).toHaveLength(2);
    expect(aggregatedData.totalMaxArrayPanelsCount).toBe(200); // 100 + 100
  });

  it('should only include active buildings in aggregated calculations', () => {
    const manager = new MultiBuildingManager();

    const building2Id = manager.addBuilding(mockBuildingInsights, mockLatLng2, 'Building 2', 1);

    // Deactivate one building
    manager.toggleBuildingActive(building2Id);

    const aggregatedData = manager.getAggregatedData(1.0, 0.85);

    expect(aggregatedData.totalPanelsCount).toBe(50); // Only building 1
    expect(aggregatedData.totalYearlyEnergyDcKwh).toBe(17000); // Only building 1: 20000 * 0.85
    expect(aggregatedData.buildings).toHaveLength(1); // Only active buildings
  });

  it('should handle panel capacity ratio adjustments', () => {
    const manager = new MultiBuildingManager();

    manager.addBuilding(mockBuildingInsights, mockLatLng1, 'Building 1', 0); // 50 panels

    // Test with different panel capacity ratios
    const dataWith1x = manager.getAggregatedData(1.0, 0.85);
    const dataWith2x = manager.getAggregatedData(2.0, 0.85);

    expect(dataWith1x.totalPanelsCount).toBe(50);
    expect(dataWith2x.totalPanelsCount).toBe(100); // Double capacity = double panels

    expect(dataWith2x.totalYearlyEnergyDcKwh).toBe(dataWith1x.totalYearlyEnergyDcKwh * 2);
  });

  it('should detect nearby buildings correctly', () => {
    const manager = new MultiBuildingManager();

    const buildingId = manager.addBuilding(mockBuildingInsights, mockLatLng1, 'Test Building');

    // Should detect the same location
    const sameLocation = manager.hasBuilding(mockLatLng1, 0.0001);
    expect(sameLocation).toBe(buildingId);

    // Should not detect a far location
    const farLocation = {
      lat: () => 40.7128,
      lng: () => -74.006,
    } as google.maps.LatLng;

    const farLocationResult = manager.hasBuilding(farLocation, 0.0001);
    expect(farLocationResult).toBeNull();
  });

  it('should clear all buildings', () => {
    const manager = new MultiBuildingManager();

    manager.addBuilding(mockBuildingInsights, mockLatLng1, 'Building 1');
    manager.addBuilding(mockBuildingInsights, mockLatLng2, 'Building 2');

    expect(manager.getAllBuildings()).toHaveLength(2);

    manager.clear();
    expect(manager.getAllBuildings()).toHaveLength(0);
  });
});
