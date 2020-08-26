import {AccessData, FirestoreDocument, FirestoreMeal, FirestoreRecipe, Rules} from "./interfaces/firestoreDatatypes";
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
            if (!await isValidChange(document, requestedChanges.requestedAccessData, context))
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
async function isValidChange(
    document: FirebaseFirestore.DocumentSnapshot,
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

    // Allow elevation of rules.
    if (onlyElevations(documentData, requestedAccessData))
        return true;

    // Decreasing of the rules
    // This is only supported if the document has no "parent" relationship with other documents
    // e.g. you can't remove a user of a recipe if this recipe is used in a meal on which the user has access
    const collectionName = document.ref.parent.id;
    switch (collectionName) {

        // Check for recipes
        case 'recipes':

            // checks if the decreased rights are higher than the rights in all related documents
            const usedInMeals = (documentData as FirestoreRecipe).used_in_meals;
            await Promise.all(usedInMeals.map(async (mealId) => {

                const docData = (await db.doc('meals/' + mealId).get()).data() as FirestoreMeal;

                // Parent document can keep its rights
                // i.g. the rights in the child document stays lower
                for (const userID in docData.access) {
                    if (!isElevation(docData.access[userID], requestedAccessData[userID]))
                        throw new Error('Decreasing not allowed! There exist a meal with higher rights!');
                }

            }));

            break;

        // default not allowed
        default:
            throw new Error('Decreasing rights of a user on this document type is not supported!');

    }

    return true;


}

function onlyElevations(documentData: FirestoreDocument, requestedAccessData: AccessData) {

    let containsOnlyElevations = true;
    for (const userID in documentData.access) {
        containsOnlyElevations = containsOnlyElevations && isElevation(documentData.access[userID], requestedAccessData[userID])
    }
    return containsOnlyElevations;

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
    document: FirebaseFirestore.DocumentSnapshot) {

    // TODO: implement access level elevation
    if (requestedChanges.upgradeOnly)
        throw Error('Upgrade not yet supported!');

    return requestedChanges.requestedAccessData;
}


/**
 *
 * Check if the change of the rule is an elevation.
 * Returns true if rules are identical.
 *
 */
function isElevation(oldRule: Rules, newRule: Rules) {

    // identical
    if (oldRule === newRule)
        return true;

    // check elevation
    if (oldRule === 'viewer' && (newRule === 'collaborator' || newRule === 'editor' || newRule === 'owner'))
        return true;
    if (oldRule === 'collaborator' && (newRule === 'editor' || newRule === 'owner'))
        return true;
    if (oldRule === 'editor' && newRule === 'owner')
        return true;

    return false;

}

