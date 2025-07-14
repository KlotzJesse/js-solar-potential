# Multi-Building Solar Potential Analysis

This document describes the new multi-building selection and analysis feature that allows users to select multiple buildings and analyze their combined solar potential.

## Features

### 1. Multi-Building Selection

- **Click to Add**: Click on different locations on the map to add buildings to your selection
- **Visual Indicators**: Selected buildings are highlighted with blue boundaries
- **Smart Detection**: Prevents duplicate selection of the same building location

### 2. Building Management

- **Building List**: View all selected buildings in a dedicated section
- **Custom Nicknames**: Edit building names (e.g., "Gebäude 14a - Büro", "Gebäude 14b - Produktion")
- **Toggle Active/Inactive**: Include or exclude buildings from calculations without removing them
- **Easy Removal**: Remove individual buildings or clear all at once

### 3. Aggregated Analysis

- **Combined Metrics**: Total panels, energy production, cost savings across all active buildings
- **Energy Coverage**: See how well the combined solar installation covers your total energy needs
- **Roof Utilization**: Understand the total available roof space across all buildings
- **Environmental Impact**: Combined CO₂ savings and environmental benefits

### 4. Enhanced User Experience

- **Building Selection**: Click on map locations to add buildings
- **Visual Feedback**: Selected buildings show blue boundaries and panel visualizations
- **Real-time Calculations**: All metrics update automatically as you add/remove buildings
- **Building-specific Details**: Each building maintains its own configuration and can be analyzed individually

## User Interface

### Multi-Building Section

The new "Multi-Gebäude" section appears when you have selected buildings and includes:

- **Building List**: Shows all selected buildings with:

  - Custom nicknames (editable)
  - Address information
  - Active/inactive toggle
  - Individual panel count and energy production
  - Remove button

- **Aggregated Summary**: Displays:
  - Total panels across all active buildings
  - Combined annual energy production
  - Total potential savings
  - Payback period for the combined installation
  - Energy coverage percentage
  - Roof utilization metrics
  - Environmental impact (CO₂ savings)

### Building Insights Section

Enhanced with:

- **Add Building Button**: Adds the currently viewed building to the multi-selection
- **Duplicate Detection**: Button is disabled if the building is already selected

## Technical Implementation

### New Components

1. **MultiBuildingManager** (`multi-building.ts`)

   - Manages the collection of selected buildings
   - Handles adding, removing, and updating buildings
   - Calculates aggregated solar data
   - Maintains map objects (panels, boundaries)

2. **MultiBuildingSection** (`MultiBuildingSection.svelte`)

   - Main UI section for multi-building management
   - Controls for showing/hiding panels
   - Integration with building list and aggregated summary

3. **MultiBuildingList** (`MultiBuildingList.svelte`)

   - List component for managing individual buildings
   - Inline editing of building nicknames
   - Active/inactive toggles
   - Building selection and removal

4. **AggregatedSummary** (`AggregatedSummary.svelte`)
   - Displays combined metrics for all active buildings
   - Energy coverage and roof utilization gauges
   - Environmental impact calculations
   - Building breakdown details

### Data Structures

```typescript
interface SelectedBuilding {
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

interface AggregatedSolarData {
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
```

## Usage Scenarios

### Scenario 1: Commercial Campus

A business with multiple buildings (office, warehouse, production facility) can:

1. Select all buildings on their campus
2. Get a comprehensive view of total solar potential
3. Plan a coordinated solar installation across all buildings
4. Compare different configuration options

### Scenario 2: Mixed-Use Development

For addresses like "14a" (office) and "14b" (production):

1. Add both buildings to the selection
2. Give them descriptive names
3. Analyze the combined energy needs
4. Determine optimal panel configurations for each building type

### Scenario 3: Investment Planning

Real estate investors can:

1. Select multiple properties
2. Compare total investment costs vs. returns
3. Understand the aggregate environmental impact
4. Plan phased installations across their portfolio

## Calculations

### Aggregated Metrics

- **Total Panels**: Sum of panels across all active buildings (adjusted for panel capacity ratio)
- **Total Energy**: Combined yearly energy production with DC to AC conversion
- **Energy Coverage**: Percentage of total energy consumption covered by solar production
- **Roof Utilization**: Percentage of available roof space utilized for panels
- **Cost Savings**: Annual savings based on local energy prices
- **Environmental Impact**: Combined CO₂ offset calculations

### Panel Capacity Adjustments

The system maintains consistency when users adjust panel capacity settings:

- All buildings use the same panel capacity ratio
- Panel counts are adjusted proportionally
- Energy calculations reflect the capacity changes
- Visual panel displays update accordingly

## Best Practices

### Building Selection

- Start with the primary building, then add secondary structures
- Use descriptive nicknames to distinguish between buildings
- Consider grouping buildings by function (office, production, storage)

### Analysis Workflow

1. Select all relevant buildings
2. Configure energy consumption parameters
3. Adjust panel specifications if needed
4. Review aggregated results
5. Export or save analysis for decision-making

### Performance Considerations

- The system is optimized for up to 10-15 buildings simultaneously
- Large numbers of selected buildings may impact map performance
- Panel visualizations can be toggled off for better performance

## Future Enhancements

Potential improvements for future versions:

- Building grouping and categorization
- Export functionality for multi-building reports
- Comparative analysis between different building sets
- Integration with financial modeling tools
- Bulk operations for similar buildings
- Historical energy usage integration
