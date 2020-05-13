import * as admin from 'firebase-admin';

import { cloudFunction, createCallableCloudFunc } from './CloudFunction';
import { createExportFiles } from './exportCamp/createExportFiles';
import { onDeleteCamp } from './onDeleteCamp';
import { onUserCreation } from './onUserCreation';
import { onDeleteSpecificMeal } from './onDeleteSpecificMeal';

// Use to set correct projectId and serviceAccount for the database
// the correct one is automaticaly set by the GClOUD_PROJECT name.
export const projectId = process.env.GCLOUD_PROJECT as string;
export const serviceAccount = require("../keys/" + projectId + "-firebase-adminsdk.json");

// connect to firebase firestore database
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://" + projectId + ".firebaseio.com"
});

export const db = admin.firestore();


////////////////////////////////////
////////////////////////////////////
// export the all cloud functions //
////////////////////////////////////
////////////////////////////////////

exports.newUserCreated = cloudFunction().auth.user().onCreate(onUserCreation());
exports.createPDF = createCallableCloudFunc(createExportFiles, "2GB");
exports.deleteCamp = cloudFunction().firestore.document('camps/{campId}').onDelete(onDeleteCamp);

exports.deleteSpecificMeal = cloudFunction().firestore.document('meals/{mealId}/specificMeals/{specificID}').onDelete(onDeleteSpecificMeal);

// TODO: Möglichkeit zum Export aus der Datenbank, aber nur mit richtiger Berechtigung...
// -> Ziel ist es, dass ein Python Skript täglich ein Backup auf den Ronaldo spielt (via. Raspberry).
// Dieses backup kann bei Bedarf wieder in die Datenbank eingespielt werden, ebenfalls per Python Skript.
// Für beides ein Passwort nötig? Dieses Passowert in einer .pass datei speichern und mit einer Hash-Verschlüsselung
// (einweg) schützen? ... Hash Code wird hier in der Cloud-Funktion entschlüsselt... so kann ein Angreifer auf 
// das Raspberry die Funktion (restore) nihct missbrauchen...

exports.checkForOldExports = createCallableCloudFunc(async () => {

    // Check docs in 'exports' collection
    (await db.collectionGroup('exports/{exportId}').get()).docs.forEach(docRef => {

        const docData = docRef.data();

        // TODO: Check date

        // Deletes the files
        deletesDocsFromExport(docData);

    })

    return { data: 'Successfully deleted old exports.' };

});


/**
 * If a firestore object of an export gets deleted, this function deletes the corresponding files in the storage
 * 
 */
exports.deleteExports = cloudFunction().firestore.document('camps/{campId}/exports/{exportId}').onDelete((snapshot) => {

    const docData = snapshot.data();
    if (docData === undefined) {
        throw new Error('No data in document!')
    }

    // Deletes the files
    deletesDocsFromExport(docData);


});


/**
 * 
 * @param docData 
 */
function deletesDocsFromExport(docData: FirebaseFirestore.DocumentData) {

    const path = docData.path;
    docData.docs.forEach((fileType: string) => admin.storage().bucket(projectId + '.appspot.com')
        .file(path + '.' + fileType).delete());

}

