import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// SecureStore has no web implementation — mirrors the Platform.OS branch in
// api/client.ts's own token storage helpers.
const storage = {
  getItem: (key: string) => (Platform.OS === "web" ? Promise.resolve(window.localStorage.getItem(key)) : SecureStore.getItemAsync(key)),
  setItem: (key: string, value: string) =>
    Platform.OS === "web" ? Promise.resolve(window.localStorage.setItem(key, value)).then(() => undefined) : SecureStore.setItemAsync(key, value).then(() => undefined),
};

export type MassUnit = "kg" | "lb";
export type LengthUnit = "m" | "ft";
export type WeightUnit = "g" | "oz";

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

      if (savedLength === "m" || savedLength === "ft") setLengthUnitState(savedLength);
      else if (legacyImperial) setLengthUnitState("ft");

      if (savedWeight === "g" || savedWeight === "oz") setWeightUnitState(savedWeight);
      else if (legacyImperial) setWeightUnitState("oz");

      setIsLoading(false);
    })();
  }, []);

  const value = useMemo<UnitsContextValue>(() => {
    const isMassLb = massUnit === "lb";
    const isLengthFt = lengthUnit === "ft";
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
        const value = isLengthFt ? metres * 3.28084 : metres;
        return `${value.toLocaleString(undefined, { maximumFractionDigits })} ${lengthUnit}`;
      },
      formatWeight: (grams, maximumFractionDigits = 1) => {
        const value = isWeightOz ? grams * 0.035274 : grams;
        return `${value.toLocaleString(undefined, { maximumFractionDigits })} ${weightUnit}`;
      },
      toDisplayMass: (kilograms) => (isMassLb ? kilograms * 2.20462 : kilograms),
      toDisplayLength: (metres) => (isLengthFt ? metres * 3.28084 : metres),
      toDisplayWeight: (grams) => (isWeightOz ? grams * 0.035274 : grams),
      fromDisplayMass: (displayValue) => (isMassLb ? displayValue / 2.20462 : displayValue),
      fromDisplayLength: (displayValue) => (isLengthFt ? displayValue / 3.28084 : displayValue),
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
