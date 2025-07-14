# Solar Potential Demo - AI Coding Guide

## Project Overview

This is a **Google Maps Solar API demonstration app** built with SvelteKit, showcasing solar panel potential calculations and visualizations. The app integrates Google Maps JavaScript API with the Solar API to display building insights and solar data layers.

## Architecture & Core Components

### Main Application Flow

- **Entry point**: `src/routes/+page.svelte` - Single-page app with Google Maps integration
- **Solar API integration**: `src/routes/solar.ts` - Core types and API interfaces
- **Data visualization**: `src/routes/visualize.ts` + `src/routes/layer.ts` - GeoTIFF rendering and map overlays
- **UI sections**: `src/routes/sections/` - Modular panels (Building Insights, Solar Potential, Data Layers)

### Key Technical Patterns

**Google Maps Integration**:

```typescript
// Always load libraries async via @googlemaps/js-api-loader
const loader = new Loader({ apiKey: googleMapsApiKey });
const libraries = {
  geometry: loader.importLibrary('geometry'),
  maps: loader.importLibrary('maps'),
  places: loader.importLibrary('places'),
};
```

**Solar API Data Flow**:

1. User clicks map → Get lat/lng → Call Solar API buildingInsights endpoint
2. Display building info + solar potential calculations
3. Optionally load data layers (GeoTIFF) for visualization overlays

**Component Architecture**:

- Use `export let` for props in Svelte components
- Material Design 3 components via `@material/web`
- Tailwind CSS for styling
- Reactive statements (`$:`) for computed values

## Development Workflow

### Essential Commands

```bash
npm run dev          # Development with hot reload
npm run build        # Production build
npm run check        # TypeScript + Svelte validation
npm run lint         # ESLint + Prettier checking
npm run format       # Auto-format code
npm run test         # Run all tests (unit + integration)
```

### Environment Setup

- **Required**: `VITE_GOOGLE_MAPS_API_KEY` in `.env` file
- Google Maps Platform project with **Maps JavaScript API** and **Solar API** enabled
- API key must have proper domain restrictions for production

### Testing Strategy

- **Unit tests**: Vitest (`*.test.ts` files in `src/`)
- **Integration tests**: Playwright (in `tests/` directory)
- **Coverage**: Vitest with v8 provider
- Run `npm test` for full test suite

## Project-Specific Conventions

### File Organization

- Routes follow SvelteKit structure: `src/routes/+page.svelte`, `src/routes/+layout.svelte`
- **Components**: `src/routes/components/` (reusable UI elements)
- **Sections**: `src/routes/sections/` (main app panels)
- **Business logic**: Direct in `src/routes/` (solar.ts, layer.ts, etc.)

### Solar API Integration Patterns

- All Solar API types defined in `src/routes/solar.ts`
- Use `BuildingInsightsResponse` and `DataLayersResponse` interfaces
- GeoTIFF downloads require API key authentication
- Coordinate system: Always use `google.maps.LatLng` objects

### Styling & UI

- **Tailwind CSS** for layout and spacing
- **Material Design 3** web components for interactive elements
- **CSS custom properties** in `src/theme/` for consistent theming
- Responsive design: sidebar collapses on mobile

### State Management

- Svelte stores for global state (minimal usage)
- Reactive statements (`$:`) for derived values
- Props drilling for component communication
- URL search params for shareable state (location, address)

## Integration Points

### External Dependencies

- **Google Maps JavaScript API**: Core mapping functionality
- **Google Solar API**: Building insights and solar potential data
- **GeoTIFF libraries**: `geotiff` + `proj4` for data layer visualization
- **Material Web Components**: UI components requiring specific import patterns

### Data Processing Pipeline

1. **Geocoding**: Address → LatLng via Google Maps Geocoder
2. **Solar API calls**: LatLng → Building insights + solar potential data
3. **GeoTIFF processing**: Download → Parse → Render to canvas → Map overlay
4. **Financial calculations**: User inputs + solar data → ROI projections

### Performance Considerations

- GeoTIFF files can be large (several MB) - implement loading states
- Google Maps API calls are rate-limited - cache results when possible
- Canvas rendering for data layers - offload to web workers for large datasets

## Common Pitfalls & Solutions

- **API Key Issues**: Ensure both Maps JS API and Solar API are enabled
- **CORS Problems**: Solar API requires proper API key authentication
- **TypeScript Errors**: Use `/* global google */` comment for Google Maps types
- **Build Failures**: Check `adapter-vercel` configuration in `svelte.config.js`
- **Component Imports**: Material Web components require specific import syntax
