import { ResponseData } from "./interface-responseData";
import { ShoppingList, UnitMismatchingError } from "./interface-ShoppingList";
import { Ingredient } from "./interface-ingredient";
import { categoryList } from "./categoryList";
import { db } from "./index";
import { UnitConvertionError } from "./unitLookUpTable";

export class InvalidDocumentPath extends Error { }


// TODO: erweitern der Export Ansicht: Wochenplan, Rezepte inkl. Mengenangeben usw.
// download der Einkaufsliste als CSV Dokument für die Weiterbearbeitung in z.B. Excel
// settings zum Export, z.B. zu den Kategoriene (Ein-/ Ausbelden)
// synched check-Boxes für Einkaufsliste... -> gemeinsames EInkaufen
// PDF download nicht mehr nur über Chrome...

/**
 * 
 * @param requestData 
 */
export async function createCampExportData(requestData: any): Promise<ResponseData> {

    const campId = requestData.campId;

    // load data form the database
    const campData = (await db.doc('camps/' + campId).get()).data();

    if (campData === undefined)
        throw new Error("Can't find camp");

    return {
        data: campData
    };

};


/**
 * Creates a shoppingList for the requested campId.
 * 
 * This creation works as following:
 * 
 * 1) It fetchs once the participants for the camp
 * 2) For each specificMeal of the camp it calculates it's participants
 * depending on the specificMealParticipants and the campParticipants
 * 3) For each specificRecipe of a meal it calculates it's participants
 * 4) add the recipe to the shoppingList and return it.
 * 
 */
export async function createShoppingListData(requestData: any): Promise<ResponseData> {

    // shoppingList object which get returned by the function
    const shoppingList: ShoppingList = new ShoppingList(categoryList);

    // log errors form the function
    const errorLogs: string[] = [];

    try {

        // undefined campId
        const campId: string = requestData.campId;
        if (campId === undefined)
            throw new InvalidDocumentPath('undefined campId');

        // load the participants form the current camp
        const campData = (await db.doc('camps/' + campId).get()).data();
        if (campData === undefined)
            throw new Error('camp not found');
        const campParticipants = campData.participants;
        console.log('Teilnehmerinnen Lager: ' + campParticipants)

        // search for all specificMeals with the given campId
        const refs = await db.collectionGroup('specificMeals').where('campId', '==', campId).get();
        await Promise.all(refs.docs.map(async (specMeal) =>
            await addMealToShoppingList(specMeal, shoppingList, campParticipants, errorLogs)));

    } catch (e) {

        if (e instanceof InvalidDocumentPath)
            errorLogs.push('Can\'t load data: ' + e);

    }

    // return the shoppingList and the errorLog to the customer
    const returnData = {
        data: shoppingList.getList(),
        error: errorLogs
    };
    return returnData;

}

async function addMealToShoppingList(specificMealDoc: FirebaseFirestore.QueryDocumentSnapshot, shoppingList: ShoppingList, campParticipants: number, errorLogs: string[]) {

    // set the mealParticipants form specificMeal (if overrided) or form the campParticipants
    const mealParticipants = specificMealDoc.data().overrideParticipants ? specificMealDoc.data().participants : campParticipants;

    console.log('Teilnehmerinnen Mahlzeit: ' + mealParticipants)

    // search for all specificRecipes with the given campId for the given specificMeal
    const refs = await db.collectionGroup('specificRecipes')
        .where('specificMealId', '==', specificMealDoc.id).get();
    await Promise.all(refs.docs.map(async (specMeal) =>
        await addRecipeToShoppingList(specMeal, shoppingList, mealParticipants, errorLogs)));

}

async function addRecipeToShoppingList(specificRecipeDoc: FirebaseFirestore.QueryDocumentSnapshot, shoppingList: ShoppingList, mealParticipants: number, err: string[]) {

    let recipeRef: string = '';
    if (specificRecipeDoc.ref.parent.parent === null) {
        throw new InvalidDocumentPath('undefined path');
    }
    recipeRef = specificRecipeDoc.ref.parent.parent.path;

    // get the participants for this recipes
    const specRecipeData = specificRecipeDoc.data();
    const participants: number = specRecipeData.overrideParticipants ? specRecipeData.participants : mealParticipants;

    console.log('Teilnehmerinnen Rezept: ' + participants)

    // load the ingredient data for the recipe (not form the specificRecipe)
    const data = (await db.doc(recipeRef).get()).data();
    if (data === undefined) {
        throw new InvalidDocumentPath('undefined path');
    }

    const ingredients = data.ingredients;
    await Promise.all(ingredients.map(async (ingredient: Ingredient) => addToShoppingList(shoppingList, ingredient, participants, err)));

}

function addToShoppingList(shoppingList: ShoppingList, ingredient: Ingredient, participants: number, error: string[]) {

    try {
        shoppingList.addIngredient(ingredient, participants);

    }
    catch (e) {

        if (e instanceof UnitConvertionError)
            error.push('Can\'t add \'' + ingredient.food + '\' to shopping list! \n' + e.message);

        if (e instanceof UnitMismatchingError)
            error.push('Can\'t add \'' + ingredient.food + '\' to shopping list! \n' + e.message);

    }
}


/**
 * 
 */
export async function createMealsInfoData(): Promise<ResponseData> {
    return await {
        data: [{
            name: 'Zmittag',
            meal: 'Hörndli und Ghacktes',
            date: 'Mittwoch, 30. November 2019',
            recipes: [
                {
                    name: 'Hörndli und Ghacktes'
                }
            ]
        }]
    };
}
