import * as  admin from 'firebase-admin';
import { db } from "./index";


// TODO: Einheiten umrechnen können... wichtige Foodelemente
// müssen in andere Einheiten umgerechnet werden könne.
// z.B. Liter in Esslöffel...

/**
 * interface for the unitLookUpTable
 */
interface UnitLookUpTable {

  [unit: string]: {
    factor: number;
    baseUnit: string;
  };

}

/**
 * 
 * units in this list can be converted to a global baseUnit
 * every supproted unit must be listed in this table
 * 
 */
const unitLookUp: UnitLookUpTable = {

  kg: { factor: 1, baseUnit: 'kg' },
  g: { factor: 0.001, baseUnit: 'kg' },
  ml: { factor: 0.0001, baseUnit: 'l' },
  cl: { factor: 0.01, baseUnit: 'l' },
  dl: { factor: 0.1, baseUnit: 'l' },
  l: { factor: 1, baseUnit: 'l' },
  'Stk.': { factor: 1, baseUnit: 'Stk.' },
  'stk.': { factor: 1, baseUnit: 'Stk.' },
  Stücke: { factor: 1, baseUnit: 'Stk.' },
  Stück: { factor: 1, baseUnit: 'Stk.' },
  Stk: { factor: 1, baseUnit: 'Stk.' },
  stk: { factor: 1, baseUnit: 'Stk.' },
  Scheibe: { factor: 1, baseUnit: 'Scheiben' },
  Scheiben: { factor: 1, baseUnit: 'Scheiben' },
  Scheib: { factor: 1, baseUnit: 'Scheiben' },
  'Scheib.': { factor: 1, baseUnit: 'Scheiben' },
  El: { factor: 1, baseUnit: 'EL' },
  EL: { factor: 1, baseUnit: 'EL' },
  el: { factor: 1, baseUnit: 'EL' },
  TL: { factor: 0.3, baseUnit: 'EL' },
  tl: { factor: 0.3, baseUnit: 'EL' },
  'Päckchen': { factor: 1, baseUnit: 'Packung' },
  Pack: { factor: 1, baseUnit: 'Packung' },
  Packung: { factor: 1, baseUnit: 'Packung' },
  Reih: { factor: 1, baseUnit: 'Reihe' },
  Reihe: { factor: 1, baseUnit: 'Reihe' },
  wenig: { factor: 0.00025, baseUnit: 'kg' },
  kl: { factor: 0.3, baseUnit: 'EL' },
  Sack: { factor: 1, baseUnit: 'Sack' },
  Zwg: { factor: 1, baseUnit: 'Zweig' },
  Zweig: { factor: 1, baseUnit: 'Zweig' },
  'Msp.': { factor: 1, baseUnit: 'Msp.' },
  'Messerspitze': { factor: 1, baseUnit: 'Msp.' },
};

/**
 * converts any unit to it's base unit,
 * this convertion is based on the unitLookUpTable
 *
 * @param measure measure in unit
 * @param unit unit of the measure
 *
 * @return measure in baseUnit and the baseUnit
 *
 */
export function toUnitMeasure(measure: number, unit: string): { measure: number, unit: string } {

  // removes unnecissary spaces
  let newUnit = unit.trim().replace(/[\r\n]+/gm, '');

  // throw an error on unknown unit
  if (!unitLookUp[unit]) {

    // write unknown unit to document in 'sharedData/unknownUnits'
    db.doc('sharedData/unknownUnits')
      .update({ units: admin.firestore.FieldValue.arrayUnion(unit) })
      .catch(e => console.error(e));

    throw new UnitConvertionError('Unknown unit: ' + unit);

  }

  // convert unit based on unitLookUpTable
  // update unit to baseUnit
  const newMeasure = measure * unitLookUp[unit].factor;
  newUnit = unitLookUp[unit].baseUnit;

  return { measure: newMeasure, unit: newUnit };

}

export class UnitConvertionError extends Error { }