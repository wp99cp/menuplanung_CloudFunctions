import * as functions from 'firebase-functions';
import { db } from '.';

/**
 * Updated den weekTitle in dem zugehörigen Camp.
 * 
 * @param change changes in the document
 * 
 */
export async function changesInSpecificMeal(change: functions.Change<FirebaseFirestore.DocumentSnapshot>) {

    const dataBefore = change.before.data();
    const dataAfter = change.after.data();

    if (dataBefore !== undefined && dataAfter !== undefined) {

        const newWeekTitle = dataAfter.weekTitle;
        const participantsWarning = dataAfter.overrideParticipants;

        if (dataBefore.weekTitle !== newWeekTitle || dataBefore.participantsWarning !== participantsWarning) {


            const camp = (await db.doc('camps/' + dataBefore.campId).get()).data();

            if (camp === undefined)
                throw new Error('camp not found');

            // change title
            camp.days.forEach((day: { meals: { forEach: (arg0: (meal: { specificId: string; description: any; }) => void) => void; }; }) =>
                day.meals.forEach((meal: { specificId: string; description: any; participantsWarning?: boolean }) => {

                    if (meal.specificId === change.after.id) {

                        meal.description = newWeekTitle;
                        meal.participantsWarning = participantsWarning;

                    }

                })
            );

            // write back to Databse
            db.doc('camps/' + dataBefore.campId).set({ days: camp.days }, { merge: true }).catch();

        }

    }

    return null;
}

