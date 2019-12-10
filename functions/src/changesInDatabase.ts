import * as functions from 'firebase-functions';
import { db } from '.';

export function campChanged(change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context: functions.EventContext) {

    console.log('changes in')
    console.log(change.after.data())

    // TODO: Update participants in every recipe and meal
    // TODO: deleted day -> delete recipes from this day...

}

export async function deleteCamp(snapshot: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) {

    const specificRecipesRefs = await db.collectionGroup('specificRecipes').where('campId', '==', snapshot.id).get();
    specificRecipesRefs.forEach(doc => doc.ref.delete());

    const specificMealsRefs = await db.collectionGroup('specificMeals').where('campId', '==', snapshot.id).get();
    specificMealsRefs.forEach(doc => doc.ref.delete());

}