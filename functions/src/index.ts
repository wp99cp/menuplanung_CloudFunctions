import * as functions from 'firebase-functions';
import { ResponseData } from "./interface-responseData";
import { createCampExportData, createShoppingListData, createMealsInfoData } from './exportData';
import { campChanged, deleteCamp } from './changesInDatabase';

import * as  admin from 'firebase-admin';

// connect to firebase firestore database
admin.initializeApp();
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

exports.newUserCreated = cloudFunction().auth.user().onCreate((user) => {

    console.log('new User created');
    console.log(user);

    // gibt einen Error!!!
    db.collection('users')
        .add({
            firstName: user.displayName,
            lastName: user.displayName,
            mail: user.email,
            sysAdmin: false,
            uid: user.uid,
            visibility: true
        })
        .catch(e => console.error(e));

    return null;

});

exports.getCampInfoExport = createCallableCloudFunc(createCampExportData);

exports.getShoppingList = createCallableCloudFunc(createShoppingListData);

exports.updateParticipants = cloudFunction()
    .firestore.document('camps/{campId}')
    .onUpdate(campChanged);

exports.deleteCamp = cloudFunction()
    .firestore.document('camps/{campId}')
    .onDelete(deleteCamp);
