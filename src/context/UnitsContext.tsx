import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { fetchPublicConfig } from "../api/publicConfig";

// SecureStore has no web implementation — mirrors the Platform.OS branch in
// api/client.ts's own token storage helpers.
const storage = {
  getItem: (key: string) => (Platform.OS === "web" ? Promise.resolve(window.localStorage.getItem(key)) : SecureStore.getItemAsync(key)),
  setItem: (key: string, value: string) =>
    Platform.OS === "web" ? Promise.resolve(window.localStorage.setItem(key, value)).then(() => undefined) : SecureStore.setItemAsync(key, value).then(() => undefined),
};

export type MassUnit = "kg" | "lb";
// Centimetres exist for hatchery troughs, which are small enough that
// metres read awkwardly (0.4 m rather than 40 cm).
export type LengthUnit = "m" | "cm" | "ft";
export type WeightUnit = "g" | "oz";

// How many display units make up one stored metre. Dimensions are always
// persisted in metres (Raceway.lengthM etc.) — this is presentation only.
export const LENGTH_PER_METRE: Record<LengthUnit, number> = { m: 1, cm: 100, ft: 3.28084 };

const isLengthUnit = (value: string | null): value is LengthUnit => value === "m" || value === "cm" || value === "ft";

interface UnitsContextValue {
  massUnit: MassUnit;
  lengthUnit: LengthUnit;
  weightUnit: WeightUnit;
  isLoading: boolean;
  setMassUnit: (unit: MassUnit) => Promise<void>;
  setLengthUnit: (unit: LengthUnit) => Promise<void>;
  setWeightUnit: (unit: WeightUnit) => Promise<void>;
  massUnitLabel: MassUnit;
  lengthUnitLabel: LengthUnit;
  weightUnitLabel: WeightUnit;
  formatMass: (kilograms: number, maximumFractionDigits?: number) => string;
  formatLength: (metres: number, maximumFractionDigits?: number) => string;
  formatWeight: (grams: number, maximumFractionDigits?: number) => string;
  // Convert a canonical stored value (kg/m/g) to the unit the user has
  // selected, for seeding an editable form field.
  toDisplayMass: (kilograms: number) => number;
  toDisplayLength: (metres: number) => number;
  toDisplayWeight: (grams: number) => number;
  // Convert a value the user typed (in their selected unit) back to the
  // canonical unit the backend stores, at submit time.
  fromDisplayMass: (displayValue: number) => number;
  fromDisplayLength: (displayValue: number) => number;
  fromDisplayWeight: (displayValue: number) => number;
}

// Mass/length/weight each have their own storage key so a farm can mix
// systems (e.g. kilograms for biomass but feet for raceway dimensions) —
// they used to be tied together behind one METRIC/IMPERIAL toggle, which
// didn't match how people actually pick units in practice.
const MASS_KEY = "aquaqueen.unit-mass";
const LENGTH_KEY = "aquaqueen.unit-length";
const WEIGHT_KEY = "aquaqueen.unit-weight";
// The old combined toggle's storage key — read once as a fallback so an
// existing IMPERIAL user doesn't get silently reset to the new defaults.
const LEGACY_SYSTEM_KEY = "aquaqueen.unit-system";

const UnitsContext = createContext<UnitsContextValue | null>(null);

const PLATFORM_UNIT_TO_LENGTH: Record<string, LengthUnit> = { METRE: "m", CENTIMETRE: "cm", FOOT: "ft" };

// Best-effort: the app has to stay usable offline or with the API down, so a
// failure here just leaves the built-in default in place rather than
// blocking startup on a preference.
async function fetchPlatformLengthUnit(): Promise<LengthUnit | null> {
  try {
    const config = await fetchPublicConfig();
    return PLATFORM_UNIT_TO_LENGTH[config.defaultLengthUnit ?? ""] ?? null;
  } catch {
    return null;
  }
}

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [massUnit, setMassUnitState] = useState<MassUnit>("kg");
  const [lengthUnit, setLengthUnitState] = useState<LengthUnit>("ft");
  const [weightUnit, setWeightUnitState] = useState<WeightUnit>("g");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [savedMass, savedLength, savedWeight, legacySystem] = await Promise.all([
        storage.getItem(MASS_KEY),
        storage.getItem(LENGTH_KEY),
        storage.getItem(WEIGHT_KEY),
        storage.getItem(LEGACY_SYSTEM_KEY),
      ]);
      const legacyImperial = legacySystem === "IMPERIAL";

      if (savedMass === "kg" || savedMass === "lb") setMassUnitState(savedMass);
      else if (legacyImperial) setMassUnitState("lb");

      // A saved device preference always wins; the platform default only
      // decides what a device that has never chosen one starts on.
      if (isLengthUnit(savedLength)) setLengthUnitState(savedLength);
      else if (legacyImperial) setLengthUnitState("ft");
      else {
        const platformDefault = await fetchPlatformLengthUnit();
        if (platformDefault) setLengthUnitState(platformDefault);
      }

      if (savedWeight === "g" || savedWeight === "oz") setWeightUnitState(savedWeight);
      else if (legacyImperial) setWeightUnitState("oz");

      setIsLoading(false);
    })();
  }, []);

  const value = useMemo<UnitsContextValue>(() => {
    const isMassLb = massUnit === "lb";
    const lengthFactor = LENGTH_PER_METRE[lengthUnit];
    const isWeightOz = weightUnit === "oz";
    return {
      massUnit,
      lengthUnit,
      weightUnit,
      isLoading,
      setMassUnit: async (next) => { setMassUnitState(next); await storage.setItem(MASS_KEY, next); },
      setLengthUnit: async (next) => { setLengthUnitState(next); await storage.setItem(LENGTH_KEY, next); },
      setWeightUnit: async (next) => { setWeightUnitState(next); await storage.setItem(WEIGHT_KEY, next); },
      massUnitLabel: massUnit,
      lengthUnitLabel: lengthUnit,
      weightUnitLabel: weightUnit,
      formatMass: (kilograms, maximumFractionDigits = 1) => {
        const value = isMassLb ? kilograms * 2.20462 : kilograms;
        return `${value.toLocaleString(undefined, { maximumFractionDigits })} ${massUnit}`;
      },
      formatLength: (metres, maximumFractionDigits = 1) => {
        const value = metres * lengthFactor;
        // Centimetres are whole numbers in practice (300 cm, not 300.0),
        // so the default precision drops to none unless a caller asks.
        const digits = lengthUnit === "cm" ? 0 : maximumFractionDigits;
        return `${value.toLocaleString(undefined, { maximumFractionDigits: digits })} ${lengthUnit}`;
      },
      formatWeight: (grams, maximumFractionDigits = 1) => {
        const value = isWeightOz ? grams * 0.035274 : grams;
        return `${value.toLocaleString(undefined, { maximumFractionDigits })} ${weightUnit}`;
      },
      toDisplayMass: (kilograms) => (isMassLb ? kilograms * 2.20462 : kilograms),
      toDisplayLength: (metres) => metres * lengthFactor,
      toDisplayWeight: (grams) => (isWeightOz ? grams * 0.035274 : grams),
      fromDisplayMass: (displayValue) => (isMassLb ? displayValue / 2.20462 : displayValue),
      fromDisplayLength: (displayValue) => displayValue / lengthFactor,
      fromDisplayWeight: (displayValue) => (isWeightOz ? displayValue / 0.035274 : displayValue),
    };
  }, [isLoading, massUnit, lengthUnit, weightUnit]);

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const context = useContext(UnitsContext);
  if (!context) throw new Error("useUnits must be used inside UnitsProvider");
  return context;
}
