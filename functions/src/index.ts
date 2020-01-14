import * as functions from 'firebase-functions';
import { ResponseData } from "./interface-responseData";
import { createCampExportData, createShoppingListData, createMealsInfoData } from './exportData';
import { deleteCamp, changesInSpecificMeal } from './changesInDatabase';
import * as  admin from 'firebase-admin';

// Use to set correct projectId and serviceAccount
const prod = false;

if (prod) {
    const serviceAccount = require("../keys/cevizh11-menuplanung-firebase-adminsdk-woa27-e2e122f8d6.json");

    // connect to firebase firestore database
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://cevizh11-menuplanung.firebaseio.com"
    });
}
else {
    const serviceAccount = require("../keys/cevizh11-firebase-adminsdk-hz6mk-4c71d5140a.json");

    // connect to firebase firestore database
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://cevizh11.firebaseio.com"
    });

}

export const db = admin.firestore();


/**
 * 
 * TODO: export dieser Funktion in ein utils.ts document
 * 
 * Creates a new https.onCall function with the basic settings
 * 
 * Used region: 'europe-west1'
 * 
 * @param createResponseFunction 
 * 
 */
const createCallableCloudFunc = (createResponseFunction: (requestData: any) => Promise<ResponseData>) => {

    return cloudFunction()

        // creat a httpsCallable function
        .https.onCall((requestData, context) => {

            // create the response and return it to the client
            return createResponseFunction(requestData);

        });

}

// TODO: export dieser Funktion in ein utils.ts document
const cloudFunction = () => {

    return functions

        // sets the region on which the cloud functions get exicuded.
        // this region must be also set in the call of the function
        .region('europe-west1')

        // runtime setting
        .runWith({
            timeoutSeconds: 20,
            memory: '256MB'
        });

};


////////////////////////////////////
////////////////////////////////////
// export the all cloud functions //
////////////////////////////////////
////////////////////////////////////

exports.getMealsInfoExport = createCallableCloudFunc(createMealsInfoData);


// TODO: diese Funktion funktioniert so nicht!! 
// Idee: Nutzer bei seiner ersten Anmelding frage, ob sein Konto öffentlich sein soll
// oder nicht... Namen angeben --> Dokument erstellen
// --> wenn so umgesetzt diese Funktion ggf. löschen...
exports.newUserCreated = cloudFunction().auth.user().onCreate((user) => {

    db.collection('users').doc(user.uid)
        .set({
            displayName: user.displayName,
            email: user.email,
            visibility: 'visible'
        })
        .then(() => console.log('Added user ' + user.displayName))
        .catch(e => console.error(e));

    return true;

});

exports.getCampInfoExport = createCallableCloudFunc(createCampExportData);

exports.getShoppingList = createCallableCloudFunc(createShoppingListData);

exports.updateWeekTitle = cloudFunction()
    .firestore.document('meals/{mealId}/specificMeals/{specificMealId}')
    .onUpdate(changesInSpecificMeal);

exports.deleteCamp = cloudFunction()
    .firestore.document('camps/{campId}')
    .onDelete(deleteCamp);
