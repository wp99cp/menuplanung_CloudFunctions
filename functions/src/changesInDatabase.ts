import * as functions from 'firebase-functions';

export function campChanged(change: functions.Change<FirebaseFirestore.DocumentSnapshot>, context: functions.EventContext) {

    console.log('changes in')
    console.log(change.after.data())

    // TODO: Update participants in every recipe and meal
    // TODO: deleted day -> delete recipes from this day...

}

export function deleteCamp(snapshot: FirebaseFirestore.DocumentSnapshot, context: functions.EventContext) {

    // TODO: Delete all documents for this meal in the database
    console.log('delete ');
    console.log(snapshot.data())


}