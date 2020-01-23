import { db } from '.';
import * as categoryList from './data/foodCategory.json';
import { Ingredient } from './interface-ingredient';
import { ResponseData } from './interface-responseData';
import { ShoppingList, UnitMismatchingError } from './interface-ShoppingList';
import { UnitConvertionError } from './unitLookUpTable';

export class InvalidDocumentPath extends Error { }


/**
 * Data Format for exporting a camp.
 * This data format is used in the exportCampData function
 * 
 */
interface ExportedCamp extends ResponseData {
    data: { mealsInfo: any; campData: any; shoppingList: any; weekView: any; }
}

/**
 * 
 * Exports all infos for a camp. This function is called to export the camp as
 * a "Lagerhandbuch". It contains all the data about a camp and could also be used
 * to export and re-import a camp to the database (not yet implemented).
 * 
 * @param requestData contains the infos about the camp
 * 
 */
export async function exportCampData(requestData: { campId: string }): Promise<ExportedCamp> {

    // request different data as Promises
    const mealInfo = createMealsInfoData(requestData);
    const campData = createCampExportData(requestData);
    const shoppingList = createShoppingListData(requestData);

    // await all data (Promises to resolve)
    await Promise.all([mealInfo, campData, shoppingList]);

    // creates and return the ExportedCamp object
    return {
        data: {
            mealsInfo: await mealInfo,
            campData: await campData,
            shoppingList: await shoppingList,
            weekView: toWeekView(campData)
        }
    }
}

/**
 * 
 * Transforms the campData to a Dataformat for creating the weekView
 * 
 * 
 * @param campData 
 */
function toWeekView(campData: any) {

    try {

        return { weekView: transformToWeekTable(campData), error: '' };

    } catch (error) {

        return { weekView: null, error: error.message };
    }

}

interface HashTable { [key: string]: string[]; }
function transformToWeekTable(campInfo: any) {

    const days = campInfo.days;

    const tableHeaders: string[] = [];

    let rows: HashTable = {};

    days?.forEach((day: { date: any; meals: [{ name: string; description: string; }]; }) => {

        // converts datum to local date string
        tableHeaders.push((new Date(day.date._seconds * 1000))
            .toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'short', day: '2-digit' }));

        // sort meals, if they aren't undefined
        if (day.meals !== undefined) {

            day.meals.sort((a, b) => a.name.localeCompare(b.name));
        }

        // add meals of day
        day.meals.forEach(meal => {


            if (rows[meal.name] === undefined) {

                rows[meal.name] = [];
                for (let i = 0; i < tableHeaders.length - 1; i++) {
                    rows[meal.name].push('-');
                }


            } else if (rows[meal.name].length === tableHeaders.length) {

                // dublicate meals on one day aren't supported yet
                // throws an error and stops weekView creation
                throw new Error('Dublicate meal on a one day!');
            }

            rows[meal.name].push(meal.description);

        });

        // add empty
        for (const key in rows) {
            if (rows[key].length < tableHeaders.length) {
                rows[key].push('-');
            }
        }

    });

    rows = sortList(rows);

    const newRows = [];
    const rowTitles = [];

    for (const key in rows) {
        if (key) {
            newRows.push(rows[key]);
            rowTitles.push(key);
        }
    }

    return { tableHeaders, rowEntries: newRows, rowTitles };

}

/**
   * Sortiert die Mahlzeiten in der richtigen Reihenfolge (Zmorgen, Znüni, ...)
   * und gibt das sortierte Object zurück.
   *
   * @param rows Zeilen der Tabelle
   */
function sortList(rows: HashTable): HashTable {

    const rowsOrdered: any = {};

    // Reihenfolge der Mahlzeiten
    const orderOfMahlzeiten = ['Zmorgen', 'Znüni', 'Zmittag', 'Zvieri', 'Znacht', 'Leitersnack', 'Vorbereiten'];

    // Sortiert das Objekt
    Object.keys(rows)
        .sort((a, b) => orderOfMahlzeiten.indexOf(a) - orderOfMahlzeiten.indexOf(b))
        .forEach((key) => {
            rowsOrdered[key] = rows[key];
        });

    return rowsOrdered;

}


/**
 * Loads the document of the camp "camps/{campId}".
 * Sorts the "camp.days" of the camp in the proper order (by date).
 * 
 * @param campData the content of the document of the camp
 * 
 */
async function createCampExportData(requestData: { campId: string }): Promise<any> {

    const campId = requestData.campId;

    // load data form the database
    const campData = (await db.doc('camps/' + campId).get()).data();

    if (campData === undefined)
        throw new Error("Can't find camp");

    // Sortiert die Tage nach dem Datum
    interface WithDate { date: number; }
    campData.days?.sort((a: WithDate, b: WithDate) => a.date - b.date);

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
