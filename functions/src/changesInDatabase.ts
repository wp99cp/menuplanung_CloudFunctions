import * as functions from 'firebase-functions';
import { db } from '.';

/**
 * Updated den weekTitle in dem zugehörigen Camp.
 * 
 * @param change 
 * @param context 
 */
export async function changeWeekTitle(change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context: functions.EventContext) {

    const dataBefore = change.before.data();
    const dataAfter = change.after.data();

    if (dataBefore !== undefined && dataAfter !== undefined) {

        const newWeekTitle = dataAfter.weekTitle;
        if (dataBefore.weekTitle !== newWeekTitle) {


            const camp = (await db.doc('camps/' + dataBefore.campId).get()).data();

            if (camp === undefined)
                throw new Error('camp not found');

            // change title
            camp.days.forEach((day: { meals: { forEach: (arg0: (meal: { specificId: string; description: any; }) => void) => void; }; }) =>
                day.meals.forEach((meal: { specificId: string; description: any; }) => {

                    if (meal.specificId === change.after.id) {
                        meal.description = newWeekTitle;
                    }

                })
            );

            // write back to Databse
            db.doc('camps/' + dataBefore.campId).set({ days: camp.days }, { merge: true }).catch();

        }

    }

    return null;
}

export async function campChanged(change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context: functions.EventContext) {

    // const dataBefore = change.before.data();
    // const dataAfter = change.after.data();

    // TODO: deleted day -> delete recipes from this day...
    // löschen der specifischen Rezepten und Mahlzeiten...
    // führt ansonsten zu einem Fehler beim Export!

    return;
}

export async function deleteCamp(snapshot: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) {

    const specificRecipesRefs = await db.collectionGroup('specificRecipes').where('campId', '==', snapshot.id).get();
    specificRecipesRefs.forEach(doc => doc.ref.delete());

    const specificMealsRefs = await db.collectionGroup('specificMeals').where('campId', '==', snapshot.id).get();
    specificMealsRefs.forEach(doc => doc.ref.delete());

}