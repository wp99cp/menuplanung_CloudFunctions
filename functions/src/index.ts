import * as functions from 'firebase-functions';
import { ResponseData } from "./interface-responseData";
import { createCampExportData, createShoppingListData, createMealsInfoData } from './exportData';

import * as  admin from 'firebase-admin';

// connect to firebase firestore database
admin.initializeApp();
export const db = admin.firestore();

/**
 * 
 * Creates a new https.onCall function with the basic settings
 * 
 * Used region: 'europe-west1'
 * 
 * @param createResponseFunction 
 * 
 */
const createHTTPSfunc = (createResponseFunction: (requestData: any) => Promise<ResponseData>) => {

    return functions

        // sets the region on which the cloud functions get exicuded.
        // this region must be also set in the call of the function
        .region('europe-west1')

        // only for testing
        .runWith({
            timeoutSeconds: 15,
            memory: '128MB'
        })

        // creat a httpsCallable function
        .https.onCall((requestData, context) => {

            // create the response and return it to the client
            return createResponseFunction(requestData);

        });

}


////////////////////////////////////
////////////////////////////////////
// export the all cloud functions //
////////////////////////////////////
////////////////////////////////////

exports.getMealsInfoExport = createHTTPSfunc(createMealsInfoData);

exports.newUserCreated = functions.auth.user().onCreate((user) => {
    console.log('new User created');

});

exports.getCampInfoExport = createHTTPSfunc(createCampExportData);

exports.getShoppingList = createHTTPSfunc(createShoppingListData);
