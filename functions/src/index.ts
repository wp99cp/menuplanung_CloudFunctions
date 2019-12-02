import * as functions from 'firebase-functions';

import { ResponseData } from "./interface-responseData";
import { createCampExportData, createShoppingListData, createMealsInfoData } from './exportData';


/**
 * 
 * Creates a new httpsCallable function with the basic settings
 * 
 * Used region: 'europe-west1'
 * 
 * @param createResponseFunction 
 * 
 */
const createHTTPSfunc = (createResponseFunction: (requestData: functions.https.Request) => Promise<ResponseData>) => {

    return functions

        // sets the region on which the cloud functions get exicuded.
        // this region must be also set in the call of the function
        .region('europe-west1')

        // creat a httpsCallable function
        .https.onRequest((requestData, response) => {

            // set the correct access header for CORS loading data
            setAccesControlHeaders(response);

            // create the response and return it to the client
            createResponseFunction(requestData)

                //  send the data after the promise is resolved
                .then(responseData => response.send(responseData))
                .catch(err => console.error);

        });

}

/**
 * 
 * @param response 
 */
const setAccesControlHeaders = (response: functions.Response) => {

    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    response.setHeader("Access-Control-Allow-Headers",
        "authorization, Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");

}

////////////////////////////////////
////////////////////////////////////
// export the all cloud functions //
////////////////////////////////////
////////////////////////////////////

/**
 * 
 */
exports.getMealsInfoExport = createHTTPSfunc(() => createMealsInfoData());

/**
 * 
 */
exports.newUserCreated = functions.auth.user().onCreate((user) => {
    console.log('new User created');

});


/** 
 * 
 * @response the camp info extracted from the database
 * 
 */
exports.getCampInfoExport = createHTTPSfunc(request => createCampExportData(request));


/**
 * 
 */
exports.getShoppingList = createHTTPSfunc(() => createShoppingListData());
