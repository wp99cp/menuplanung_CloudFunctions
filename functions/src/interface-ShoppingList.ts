import { toUnitMeasure } from "./unitLookUpTable";
import { Ingredient } from "./interface-ingredient";


/**
 * 
 */
interface ShoppingCard {

    [food: string]: {
        measure: number;
        unit: string;
        category: string
    };

}



/**
 * 
 */
export class ShoppingList {

    public list: ShoppingCard = {};


    // known category for food
    private categoryData: { [food: string]: string };

    // list of uncategorised items in the shoppingList
    private uncategorised: string[] = [];


    /**
     * creates a new shoppingList object.
     * A shoppingList element can handle a shoppingList.
     * 
     * @param categoryData known categories for food items
     * 
     */
    constructor(categoryData: { [category: string]: string[] }) {

        this.categoryData = {};

        for (const category in categoryData) {
            categoryData[category].forEach(food => this.categoryData[food] = category);

        }

    }


    /**
     * Adds an ingredient to the shopping List.
     * 
     * Calculetes the mesurement with the given participants number. 
     * 
     * @param ing 
     * @param participants 
     */
    public addIngredient(ing: Ingredient, participants: number) {

        const foodName = ing.food.trim().replace(/[\r\n]+/gm, '')

        const inBaseUnit = toUnitMeasure(ing.measure, ing.unit);
        let measure = 0;
        let category = '';

        if (this.list[foodName]) {

            measure = this.list[foodName].measure;
            category = this.list[foodName].category;

            if (this.list[foodName].unit !== inBaseUnit.unit) {
                throw new Error('Can\'t add ' + inBaseUnit.unit + ' to ' + this.list[ing.unit]);
            }

        }
        else {
            category = this.getFoodCategory(foodName);
        }

        measure = measure + inBaseUnit.measure * participants;

        this.list[foodName] = {

            measure: measure + ing.measure * participants,
            unit: inBaseUnit.unit,
            category: category

        };

    }

    private getFoodCategory(food: string): string {

        if (this.categoryData[food] !== undefined) {
            return this.categoryData[food];
        }

        this.uncategorised.push(food);

        return 'Diverses';

    }


    public getList(): ShoppingCard {

        return this.list;

    }

}