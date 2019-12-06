import { ResponseData } from "./interface-responseData";
import { ShoppingList } from "./interface-ShoppingList";
import { Ingredient } from "./interface-ingredient";
import { categoryList } from "./categoryList";

import * as  admin from 'firebase-admin';

// connect to firebase firestore database
admin.initializeApp();
const db = admin.firestore();


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

    const campId: string = requestData.campId;

    if (campId === undefined) {
        throw new Error('undefined campId');

    }

    // shoppingList object which get returned by the function
    const shoppingList: ShoppingList = new ShoppingList(categoryList);

    // search for all specificRecipes with the given campId
    const refs = await db.collectionGroup('specificRecipes').where('campId', '==', campId).get();

    // for each specificRecipe
    await Promise.all(refs.docs.map(async (specificRecipeDoc) => {

        let recipeRef: string = '';

        if (specificRecipeDoc.ref.parent.parent === null) {
            throw new Error('undefined path');

        }

        recipeRef = specificRecipeDoc.ref.parent.parent.path;

        // get the participants for this recipes
        const participants: number = specificRecipeDoc.data().participants;

        // load the ingredient data for the ricipe
        const data = (await db.doc(recipeRef).get()).data();

        if (data === undefined) {
            throw new Error('undefined path');

        }

        const ingredients = data.ingredients;


        await Promise.all(ingredients.map(async (ingredient: Ingredient) => {
            shoppingList.addIngredient(ingredient, participants);
        }));

    }));

    return { data: shoppingList.getList() };

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