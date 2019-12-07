import { ResponseData } from "./interface-responseData";
import { ShoppingList, UnitMismatchingError } from "./interface-ShoppingList";
import { Ingredient } from "./interface-ingredient";
import { categoryList } from "./categoryList";
import { db } from "./index";
import { UnitConvertionError } from "./unitLookUpTable";

export class InvalidDocumentPath extends Error { }

/**
 * 
 * @param requestData 
 */
export async function createCampExportData(requestData: any): Promise<ResponseData> {

    // TODO: change to dynamic camp id
    const campId = requestData.campId;

    // load data form the database
    const snapshot = await db.doc('camps/' + campId).get();

    // create the DataObject for the return
    return {
        data: snapshot.data()
    };

};


/**
 * creates a shoppingList for the requested campId
 * 
 */
export async function createShoppingListData(requestData: any): Promise<ResponseData> {

    // shoppingList object which get returned by the function
    const shoppingList: ShoppingList = new ShoppingList(categoryList);

    // log errors form the function
    const err: string[] = [];

    try {

        const campId: string = requestData.campId;

        if (campId === undefined)
            throw new InvalidDocumentPath('undefined campId');



        // search for all specificRecipes with the given campId
        const refs = await db.collectionGroup('specificRecipes').where('campId', '==', campId).get();

        // for each specificRecipe
        await Promise.all(refs.docs.map(async (specRecip) => await addRecipeToShoppingList(specRecip, shoppingList, err)));

    } catch (e) {

        if (e instanceof InvalidDocumentPath)
            err.push('Can\'t load data: ' + e);

    }

    return { data: shoppingList.getList(), error: err };

}



async function addRecipeToShoppingList(specificRecipeDoc: FirebaseFirestore.QueryDocumentSnapshot, shoppingList: ShoppingList, err: string[]) {

    let recipeRef: string = '';

    if (specificRecipeDoc.ref.parent.parent === null) {
        throw new InvalidDocumentPath('undefined path');
    }

    recipeRef = specificRecipeDoc.ref.parent.parent.path;

    // get the participants for this recipes
    const participants: number = specificRecipeDoc.data().participants;

    // load the ingredient data for the ricipe
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
            error.push('Can\'t add ' + ingredient.food + ' to shopping list! \n' + e.message);

        if (e instanceof UnitMismatchingError)
            error.push('Can\'t add ' + ingredient.food + ' to shopping list! \n' + e.message);

    }
}




/**
 * 
 */
export async function createMealsInfoData(): Promise<ResponseData> {
    return await {
        data: {
            name: 'Zmittag',
            meal: 'Hörndli und Ghacktes',
            date: 'Mittwoch, 30. November 2019',
            recipes: [
                {
                    name: 'Hörndli und Ghacktes'
                }
            ]
        }
    };
}