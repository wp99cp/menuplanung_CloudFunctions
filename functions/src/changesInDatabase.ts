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

/**
 * 
 * Updated die Teilnehmeranzahl in den spezifischen Rezepten.
 * 
 * @param change 
 * @param context 
 */
export async function mealChanged(change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context: functions.EventContext) {

    const dataBefore = change.before.data();
    const dataAfter = change.after.data();

    if (dataBefore !== undefined && dataAfter !== undefined) {

        const participants = dataAfter.participants;

        if (dataBefore.participants !== participants) {

            let path = 'meals/' + context.params.mealId + "/recipes";
            const docRefs = (await db.collection(path).get()).docs;

            for (const docRef of docRefs) {

                // update path to specificRecipe
                path = path + "/" + docRef.id + "/specificRecipes/" + context.params.specificMealId;
                const specificRecipe = (await db.doc(path).get()).data();

                // Update in der Datenbank, falls nicht überschriben
                if (specificRecipe !== undefined && !specificRecipe.overrideParticipants)
                    db.doc(path).set({ participants: dataAfter.participants }, { merge: true }).catch();

            }

        }

    }
}

export async function campChanged(change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context: functions.EventContext) {

    const dataBefore = change.before.data();
    const dataAfter = change.after.data();

    // update Teilnehmeranzahl
    await updateParticipantsInMeals(dataBefore, dataAfter);

    // TODO: deleted day -> delete recipes from this day...
    // löschen der specifischen Rezepten und Mahlzeiten...
    // führt ansonsten zu einem Fehler beim Export!

    return;
}

async function updateParticipantsInMeals(dataBefore: FirebaseFirestore.DocumentData | undefined, dataAfter: FirebaseFirestore.DocumentData | undefined) {

    if (dataBefore !== undefined && dataAfter !== undefined) {

        const participants = dataAfter.participants;

        if (dataBefore.participants !== participants) {
            for (const day of dataAfter.days) {
                for (const meal of day.meals) {
                    const path = 'meals/' + meal.firestoreElementId + "/specificMeals/" + meal.specificId;
                    const specificMeal = (await db.doc(path).get()).data();
                    if (specificMeal !== undefined && !specificMeal.overrideParticipants)
                        db.doc(path).set({ participants: dataAfter.participants }, { merge: true }).catch();
                }
            }
        }

    }
}

export async function deleteCamp(snapshot: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) {

    const specificRecipesRefs = await db.collectionGroup('specificRecipes').where('campId', '==', snapshot.id).get();
    specificRecipesRefs.forEach(doc => doc.ref.delete());

    const specificMealsRefs = await db.collectionGroup('specificMeals').where('campId', '==', snapshot.id).get();
    specificMealsRefs.forEach(doc => doc.ref.delete());

}