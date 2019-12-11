import * as functions from 'firebase-functions';
import { db } from '.';


// TODO: wird eine Mahlzeit verändert (insbesonders Titel), so muss dieser in
// jedem Lager aktuallisiert werden! --> ggf. eigenes Feld einführen für "Titel in der Wochenübersicht"
// dann ist nur bei einer Veränderung dieses Feldes ein Update möglich. --> spart viele Schreib-Vorgänger in der DB

export function campChanged(change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context: functions.EventContext) {

    console.log('changes in')
    console.log(change.after.data())

    // TODO: Update participants in every recipe and meal
    // Hierzu muss beim specificMeal und beim specificRecipe zusätzlich ein Feld
    // "participantsFormParent" eingefügt werden, hat dieses Feld einen Wert von "true"
    // so wird es aktuallisiert, sonst nicht...

    // TODO: deleted day -> delete recipes from this day...
    // löschen der specifischen Rezepten und Mahlzeiten...
    // führt ansonsten zu einem Fehler beim Export!

}

export async function deleteCamp(snapshot: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) {

    const specificRecipesRefs = await db.collectionGroup('specificRecipes').where('campId', '==', snapshot.id).get();
    specificRecipesRefs.forEach(doc => doc.ref.delete());

    const specificMealsRefs = await db.collectionGroup('specificMeals').where('campId', '==', snapshot.id).get();
    specificMealsRefs.forEach(doc => doc.ref.delete());

}