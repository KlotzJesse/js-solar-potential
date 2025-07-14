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

import type { SolarPanelConfig } from './solar';

export function showNumber(x: number) {
  return x.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

export function formatNumber(x: number) {
  return showNumber(x);
}

export function convertYourDateToNativeJSDate(
  yourDate: { year: number; month: number; day: number } | null | undefined,
): globalThis.Date | null {
  if (!yourDate) {
    return null;
  }
  return new globalThis.Date(yourDate.year, yourDate.month - 1, yourDate.day);
}

// Helper function to safely format a native JS Date
export function formatNativeDate(
  nativeDate: globalThis.Date | null,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  if (!nativeDate) {
    return 'N/A'; // Or some other placeholder
  }
  if (isNaN(nativeDate.getTime())) {
    return 'Invalid Date';
  }
  return nativeDate.toLocaleDateString(locale, options);
}

export function showMoney(amount: number) {
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function findSolarConfig(
  solarPanelConfigs: SolarPanelConfig[],
  yearlyKwhEnergyConsumption: number,
  panelCapacityRatio: number,
  dcToAcDerate: number,
) {
  return solarPanelConfigs.findIndex(
    (config) =>
      config.yearlyEnergyDcKwh * panelCapacityRatio * dcToAcDerate >= yearlyKwhEnergyConsumption,
  );
}
