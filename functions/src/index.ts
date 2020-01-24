import * as admin from 'firebase-admin';

import { changesInSpecificMeal } from './changesInDatabase';
import { onDeleteCamp } from "./onDeleteCamp";
import { cloudFunction, createCallableCloudFunc } from './CloudFunction';
import { createExportFiles } from './exportCamp/createExportFiles';
import { exportCampData } from './exportCamp/exportData';
import { onUserCreation } from './onUserCreation';

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

exports.exportCampData = createCallableCloudFunc(exportCampData);
exports.createPDF = createCallableCloudFunc(createExportFiles, "2GB");

exports.updateWeekTitle = cloudFunction()
    .firestore.document('meals/{mealId}/specificMeals/{specificMealId}')
    .onUpdate(changesInSpecificMeal);

exports.deleteCamp = cloudFunction()
    .firestore.document('camps/{campId}')
    .onDelete(onDeleteCamp);
