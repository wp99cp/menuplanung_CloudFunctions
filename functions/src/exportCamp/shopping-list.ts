import { Ingredient } from '../interfaces/firestoreDatatypes'
import { ExportedRecipe } from '../interfaces/exportDatatypes';


export type ShoppingList = ShoppingListCategory[];
export interface ShoppingListCategory {
    categoryName: string;
    ingredients: Ingredient[];
}

interface InternalShoppingList {
    [category: string]: ShoppingListItems;
}
interface ShoppingListItems {

    [food: string]: {
        measure: number;
        unit: string;
        comment: string;
    }

}

/**
 * Helps to create a ShoppingList
 * 
 * Combines ingredients of recipes to create a shoppingList
 * 
 */
export class ShoppingListCreator {

    private internalList: InternalShoppingList;

    constructor() {

        this.internalList = {};

    }

    /**
     * 
     * Fügt ein Rezept zur ShoppingList hinzu
     * 
     * @param recipe 
     */
    public addRecipe(recipe: ExportedRecipe) {

        recipe.ingredients.forEach(ing => {


            const catName = this.getCatName(ing);
            ing.measure = ing.measure * recipe.recipe_participants;
            this.toBaseUnit(ing);

            // adds ingredient
            this.addIngredient(ing, catName);

        });

    }

    /**
     * Convertiert ein Ingredient in die
     * BaseUnit.
     * 
     * @param ing 
     */
    private toBaseUnit(ing: Ingredient) {

        ing.unit = 'kg';
        ing.measure = 1000;

    }

    /**
     * Searches for the category of the ingredient
     * 
     * @param ing 
     * @returns the name of the category of the ingredient
     * 
     */
    private getCatName(ing: Ingredient) {



        return 'Diverses';

    }

    /**
     * 
     * Adds all the Items of the shoppinglist to the 
     * InternalShoppingList
     * 
     * @param shoppingList 
     * 
     */
    public mergeShoppingList(shoppingList: ShoppingList) {

        if (shoppingList !== undefined) {

            shoppingList.forEach(cat => {
                cat.ingredients.forEach(ing => this.addIngredient(ing, cat.categoryName));
            });

        }

    }

    /**
     * 
     * Adds an ingredient to the shopping list.
     * Adds the ingredient to the given category.
     * 
     * @param ing 
     * @param categoryName 
     */
    private addIngredient(ing: Ingredient, categoryName: string) {

        // category does not exist --> create category
        if (this.internalList[categoryName] === undefined) {
            this.internalList[categoryName] = {};
        }

        // if food exist --> add up measure
        if (this.internalList[categoryName][ing.food] !== undefined) {
            // Error on incompatible units
            if (this.internalList[categoryName][ing.food].unit !== ing.unit) {
                throw new Error('Incompatible Units!');
            }

            this.internalList[categoryName][ing.food].measure += ing.measure;
        }
        else {
            // add the food item to the list
            this.internalList[categoryName][ing.food] = {
                measure: ing.measure,
                comment: ing.comment,
                unit: ing.unit
            };
        }

    }

    /**
     * Exports the ShoppingList
     * 
     */
    public getShoppingList(): ShoppingList {

        // erstellt eine Leere ShoppingList
        const shoppingList: ShoppingList = [];

        for (const categoryName in this.internalList) {

            const shoppingListCategory: ShoppingListCategory = {
                categoryName,
                ingredients: []
            };

            for (const foodName in this.internalList[categoryName]) {

                const shoppingListItem = this.internalList[categoryName][foodName];

                const ingredient = {
                    food: foodName,
                    measure: shoppingListItem.measure,
                    comment: shoppingListItem.comment,
                    unit: shoppingListItem.unit

                };

                shoppingListCategory.ingredients.push(ingredient);

            }

            shoppingList.push(shoppingListCategory);

        }

        return shoppingList;

    }

}