import { db } from '.';
import * as categoryList from './data/foodCategory.json';
import { Ingredient } from './interface-ingredient';
import { ResponseData } from './interface-responseData';
import { ShoppingList, UnitMismatchingError } from './interface-ShoppingList';
import { UnitConvertionError } from './unitLookUpTable';

export class InvalidDocumentPath extends Error { }

// expotes the campInfos
export async function exportCampData(requestData: any): Promise<ResponseData> {

    return {
        data: {
            mealsInfo: await createMealsInfoData(requestData),
            campData: await createCampExportData(requestData),
            shoppingList: await createShoppingListData(requestData)
        }
    };

}



// TODO: erweitern der Export Ansicht: Wochenplan, Rezepte inkl. Mengenangeben usw.
// download der Einkaufsliste als CSV Dokument für die Weiterbearbeitung in z.B. Excel
// settings zum Export, z.B. zu den Kategoriene (Ein-/ Ausbelden)
// synched check-Boxes für Einkaufsliste... -> gemeinsames EInkaufen
// PDF download nicht mehr nur über Chrome...

/**
 * 
 * @param requestData 
 */
async function createCampExportData(requestData: any): Promise<any> {

    const campId = requestData.campId;

    // load data form the database
    const campData = (await db.doc('camps/' + campId).get()).data();

    if (campData === undefined)
        throw new Error("Can't find camp");

    return campData;

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
async function createShoppingListData(requestData: any): Promise<any> {

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


        // search for all specificMeals with the given campId
        const refs = await db.collectionGroup('specificMeals').where('campId', '==', campId).get();
        await Promise.all(refs.docs.map(async (specMeal) =>
            await addMealToShoppingList(specMeal, shoppingList, campData as { participants: number, vegetarier: number }, errorLogs)));

    } catch (e) {

        if (e instanceof InvalidDocumentPath)
            errorLogs.push('Can\'t load data: ' + e);

    }


    const shoppingListData = shoppingList.getList();

    const arry: any = [];
    for (const ing in shoppingListData) {
        if (ing) {
            if (!arry[shoppingListData[ing].category]) {
                arry[shoppingListData[ing].category] = [];
            }
            arry[shoppingListData[ing].category].push({
                food: ing,
                measure: shoppingListData[ing].measure.toFixed(2),
                unit: shoppingListData[ing].unit
            });
        }
    }

    const array = [];
    for (const cat in arry) {
        if (cat) {
            array.push({
                name: cat,
                ingredients: arry[cat]
            });
        }
    }

    // return the shoppingList and the errorLog to the customer
    return { shoppingList: array, error: errorLogs };



}

async function addMealToShoppingList(specificMealDoc: FirebaseFirestore.QueryDocumentSnapshot, shoppingList: ShoppingList, campData: { participants: number, vegetarier: number }, errorLogs: string[]) {

    // set the mealParticipants form specificMeal (if overrided) or form the campParticipants
    const mealParticipants = specificMealDoc.data().overrideParticipants ? specificMealDoc.data().participants : campData.participants;

    console.log('Teilnehmerinnen Mahlzeit: ' + mealParticipants)

    // search for all specificRecipes with the given campId for the given specificMeal
    const refs = await db.collectionGroup('specificRecipes')
        .where('specificMealId', '==', specificMealDoc.id).get();
    await Promise.all(refs.docs.map(async (specMeal) =>
        await addRecipeToShoppingList(specMeal, shoppingList, mealParticipants, campData, errorLogs)));

}

async function addRecipeToShoppingList(specificRecipeDoc: FirebaseFirestore.QueryDocumentSnapshot, shoppingList: ShoppingList, mealParticipants: number, campData: { participants: number, vegetarier: number }, err: string[]) {

    let recipeRef: string = '';
    if (specificRecipeDoc.ref.parent.parent === null) {
        throw new InvalidDocumentPath('undefined path');
    }
    recipeRef = specificRecipeDoc.ref.parent.parent.path;

    // get the participants for this recipes
    const specRecipeData = specificRecipeDoc.data();
    let participants: number = specRecipeData.overrideParticipants ? specRecipeData.participants : mealParticipants;

    if (specRecipeData.vegi !== undefined) {

        switch (specRecipeData.vegi) {

            case 'vegiOnly':
                participants = campData.vegetarier;
                break;
            case 'nonVegi':
                participants = participants - campData.vegetarier;
                break;
            default:
                participants = participants;

        }

    }


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
 * exportiert die Mahlzeiten für den Druck des Lagerdossies
 * 
 */
async function createMealsInfoData(requestData: any): Promise<any> {

    interface Recipe { description: string, ingredients: Ingredient[], participants: number, vegi: 'all' | 'vegiOnly' | 'nonVegi' };
    interface Meal { description: string, firestoreElementId: string, name: string, specificId: string, recipes: Recipe[], participants: number, usedAs: string, date: any };
    interface SpecificMeal { overrideParticipants: boolean, participants: number };
    interface SpecificRecipe { overrideParticipants: boolean, participants: number, vegi: 'all' | 'vegiOnly' | 'nonVegi' };
    interface Day { date: any, meals: Meal[] }
    interface Camp { days: Day[], participants: number, vegetarier: number };

    // undefined campId
    const campId: string = requestData.campId;
    if (campId === undefined)
        throw new InvalidDocumentPath('undefined campId');

    // load the participants form the current camp
    const campData = (await db.doc('camps/' + campId).get()).data() as Camp;
    if (campData === undefined)
        throw new Error('camp not found');

    const meals: Meal[] = [];

    await Promise.all(campData.days.map(async (day: Day) => {
        return Promise.all(day.meals.map(async (meal: Meal) => {
            return addMealToList(meal, day);
        }));
    }));

    return meals;

    async function addMealToList(meal: Meal, day: Day) {

        meal.usedAs = meal.name;
        meal.name = meal.description;
        meal.participants = campData.participants;
        meal.date = day.date;

        // ladet die Mahlzeit
        const loadedMeal = (await db.doc('meals/' + meal.firestoreElementId).get()).data() as Meal;
        meal.description = loadedMeal.description;

        // lader specifische Mahlzeit
        const loadedSpecificMeal = (await db.doc('meals/' + meal.firestoreElementId + '/specificMeals/' + meal.specificId).get()).data() as SpecificMeal;
        if (loadedSpecificMeal.overrideParticipants) {
            meal.participants = loadedSpecificMeal.participants;
        }

        // load recipes
        meal.recipes = [];
        await Promise.all((await db.collection('meals/' + meal.firestoreElementId + '/recipes').get()).docs.map(async (recipesRef) => {

            const recipe = recipesRef.data() as Recipe;

            // lader specifische Mahlzeit
            const loadedSpecificRecipe = (await db.doc('meals/' + meal.firestoreElementId + '/recipes/' + recipesRef.id + '/specificRecipes/' + meal.specificId).get()).data() as SpecificRecipe;
            recipe.vegi = loadedSpecificRecipe.vegi;

            // TODO: extract to shared code!!!!
            if (loadedSpecificRecipe.overrideParticipants) {
                recipe.participants = loadedSpecificRecipe.participants;
            } else {
                recipe.participants = meal.participants;
            }

            if (recipe.vegi === 'vegiOnly') {
                recipe.participants = campData.vegetarier;
            }
            else if (recipe.vegi === 'nonVegi') {
                recipe.participants = recipe.participants - campData.vegetarier;
            }

            meal.recipes.push(recipe);

            return;

        }));

        // fügt Mahlzeit zur Liste hinzu
        meals.push(meal);

        return;

    }
}
