import {AccessData, FirestoreDocument} from "./interfaces/firestoreDatatypes";
import {db} from "./index";
import * as functions from 'firebase-functions';

/**
 *  Data needed to request a access change of a document.
 *
 */
export interface AccessChange {

    documentPath: string;
    requestedAccessData: AccessData;
    upgradeOnly: boolean;

}


/**
 *
 * Changes the accessData of an object in the database.
 * AccessData can't be changed directly by the user all changes are handheld by this function.
 *
 * This operation runs in a transaction to prevent the database from failed or unfinished access changes.
 * Unfinished access changes lead to a security vulnerability.
 *
 * @param requestData
 */
export function changeAccessData(requestedChanges: AccessChange, context: functions.https.CallableContext): Promise<any> {

    const documentRef = db.doc(requestedChanges.documentPath);

    return new Promise((resolve) => {

        db.runTransaction(async (transaction) => {

            const document = await transaction.get(documentRef);

            // check if changes are valid
            if (!isValidChange(document, requestedChanges.requestedAccessData, context))
                throw new Error('Invalid access change!');

            const access = generateNewAccessData(requestedChanges, document);

            // update accessData in document
            transaction.update(documentRef, {access});

            // update related documents...
            const collectionName = documentRef.parent.id;
            switch (collectionName) {

                // elevate the rules of users in all related meals and specificMeals and specificRecipes
                case 'camps':
                    throw new Error('Share camps not yet supported!');
                    break;

                // elevate the rules of users in all related recipes
                case 'meals':
                    throw new Error('Share meals not yet supported!');
                    break;

                // e.g. "recipes" do nothing
                default:
                    break;

            }

        })
            .then(() => resolve({message: 'AccessData successfully updated.'}))
            .catch(err => resolve({error: err.message}));


    });

}

/**
 *
 * Checks if the changes to the accessData for this document is valid.
 * This function defines all security rules related to change access of a document!
 *
 * @param document to apply the changes
 * @param requestedAccessData requested changes to the accessData
 *
 */
function isValidChange(
    document: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>,
    requestedAccessData: AccessData,
    context: functions.https.CallableContext) {

    // request document content
    const documentData = document.data() as (FirestoreDocument | undefined);
    if (documentData === undefined) {
        throw new Error('Invalid documentPath!');
    }

    // get uid form the context of the callable function
    const uid = context.auth?.uid;
    if (uid === undefined)
        throw new Error('User not authenticated!');

    // check if user has owner access on the document
    const ruleOfCurrentUser = documentData.access[uid];
    if (ruleOfCurrentUser !== 'owner')
        throw new Error('Only the owner can change the access data!');

    // the owner of the document can't be changed, you can't add a second owner
    if (requestedAccessData[uid] !== 'owner' ||
        Object.values(requestedAccessData).filter(v => v === 'owner').length !== 1)
        throw new Error('The owner of the document can\'t be changed!');


    /*
     * TODO: Check if a user is removed or decreased
     * This is only supported if the document has no "parent" relationship with other documents
     * e.g. you can't remove a user of a recipe if this recipe is used in a meal on which the user has access
     *
     */

    return true;


}

/**
 * Generates the new accessData for the document.
 *
 * If requestedChanges.upgradeOnly is set to false this function returns the value of the
 * requestedChanges.requestedAccessData field. Otherwise it will elevate the rules such that
 * all user has a minimum access level as described in requestedChanges.requestedAccessData.
 *
 * Access level of users not mention in requestedChanges.requestedAccessData will not be changed.
 *
 * @param requestedChanges
 * @param document
 */
function generateNewAccessData(
    requestedChanges: AccessChange,
    document: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {

    // TODO: implement access level elevation
    if (requestedChanges.upgradeOnly)
        throw Error('Upgrade not yet supported!');

    return requestedChanges.requestedAccessData;
}


