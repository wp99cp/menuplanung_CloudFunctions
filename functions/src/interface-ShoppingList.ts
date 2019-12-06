import { toUnitMeasure } from "./unitLookUpTable";
import { Ingredient } from "./interface-ingredient";


/**
 * 
 */
export class ShoppingList {


    public list: {
        [food: string]: {
            measure: number;
            unit: string;
        };
    } = {};

    /**
     * 
     * @param ing 
     * @param participants 
     */
    public addIngredients(ing: Ingredient, participants: number) {

        const inBaseUnit = toUnitMeasure(ing.measure, ing.unit);
        let measure = 0;
        if (this.list[ing.food]) {
            measure = this.list[ing.food].measure;
            if (this.list[ing.food].unit !== inBaseUnit.unit) {
                throw new Error('Can\'t add ' + inBaseUnit.unit + ' to ' + this.list[ing.unit]);
            }
        }
        measure = measure + inBaseUnit.measure * participants;
        this.list[ing.food] = {
            measure: measure + ing.measure * participants,
            unit: inBaseUnit.unit
        };
    }

}