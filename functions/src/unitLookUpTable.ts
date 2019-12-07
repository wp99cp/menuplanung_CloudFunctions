import { db } from "./index";


/**
 * interface for the unitLookUpTable
 * 
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
  Stk: { factor: 1, baseUnit: 'Stk.' },
  stk: { factor: 1, baseUnit: 'Stk.' },
  Scheib: { factor: 1, baseUnit: 'Scheiben' },
  EL: { factor: 1, baseUnit: 'EL' },
  el: { factor: 1, baseUnit: 'EL' },
  TL: { factor: 13, baseUnit: 'EL' },
  tl: { factor: 13, baseUnit: 'EL' }

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
      .set({ unknownUnits: [unit] }, { merge: true })
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