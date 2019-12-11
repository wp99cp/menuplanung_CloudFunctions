import { toUnitMeasure as toBaseUnitMeasure } from "./unitLookUpTable";
import { Ingredient } from "./interface-ingredient";
import { db } from "./index";
import admin = require("firebase-admin");


/**
 * TODO: eigenes .ts file für dieses interface
 */
interface ShoppingCard {

    [food: string]: {
        measure: number;
        unit: string;
        category: string
    };

}

export class UnitMismatchingError extends Error { }

/**
 * 
 */
export class ShoppingList {

    public list: ShoppingCard = {};


    // known category for food
    private categoryData: { [food: string]: string };



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
     * 
     * TODO: test für diese Funktion schreiben!!!
     * 
     * Adds an ingredient to the shopping List.
     * 
     * Calculetes the mesurement with the given participants number. 
     * 
     * @param ing 
     * @param participants 
     */
    public addIngredient(ing: Ingredient, participants: number) {

        const foodName = ing.food.trim().replace(/[\r\n]+/gm, '')

        const inBaseUnit = toBaseUnitMeasure(ing.measure, ing.unit);

        let measure = 0;
        let category = '';

        if (this.list[foodName]) {

            measure = this.list[foodName].measure;
            category = this.list[foodName].category;

            if (this.list[foodName].unit !== inBaseUnit.unit)
                throw new UnitMismatchingError('Can\'t add ' + inBaseUnit.unit + ' to ' + this.list[ing.unit]);


        }
        else {
            category = this.getFoodCategory(foodName);
        }

        measure = measure + inBaseUnit.measure * participants;

        this.list[foodName] = {

            measure,
            unit: inBaseUnit.unit,
            category: category

        };

    }

    private getFoodCategory(food: string): string {

        if (this.categoryData[food] !== undefined) {
            return this.categoryData[food];
        }

        // write unknown unit to document in 'sharedData/foodCategories'
        db.doc('sharedData/foodCategories')
            .update({ uncategorised: admin.firestore.FieldValue.arrayUnion(food) })
            .catch(e => console.error(e));

        return 'Nicht Kategorisiert';

    }


    public getList(): ShoppingCard {

        return this.list;

    }

}
