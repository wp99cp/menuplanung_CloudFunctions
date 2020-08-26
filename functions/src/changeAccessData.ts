import {AccessData, FirestoreDocument, FirestoreMeal, FirestoreRecipe, Rules} from "./interfaces/firestoreDatatypes";
import {db} from "./index";
import * as functions from 'firebase-functions';

/**
 *  Data needed to request a access change of a document.
 *  Format of the function call argument.
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
 * @param requestedChanges to the accessData
 * @param context of the function call
 */
export function changeAccessData(requestedChanges: AccessChange, context: functions.https.CallableContext): Promise<any> {

    return new Promise((resolve) => {

        db.runTransaction(async (transaction) =>
            await changeAccessDataWithTransaction(transaction, requestedChanges, context, undefined))

            // function create response
            .then(() => resolve({message: 'AccessData successfully updated.'}))
            .catch(err => resolve({error: err.message}));

    });

}

/**
 *
 * Performs the access change inside a transaction.
 * This function can be called iterativ with different arguments.
 *
 * @param transaction: the current transaction to perform all read and writes in it.
 * @param requestedChanges to the access data
 * @param context of the cloud function call
 * @param parentId optional parameter with a parent document id to exclude in some checks
 *
 */
async function changeAccessDataWithTransaction(
    transaction: FirebaseFirestore.Transaction,
    requestedChanges: AccessChange,
    context: functions.https.CallableContext,
    parentId?: string | undefined) {

    const documentRef = db.doc(requestedChanges.documentPath);

    const document = await transaction.get(documentRef);

    // check if changes are valid
    if (!await isValidChange(document, requestedChanges.requestedAccessData, context, parentId))
        throw new Error('Invalid access change!');

    // elevate rights...
    const documentData = document.data() as (FirestoreDocument | undefined) as FirestoreDocument;
    if (containsOnlyElevations(documentData, requestedChanges.requestedAccessData) || requestedChanges.upgradeOnly) {

        // update accessData in document
        const access = generateNewAccessData(requestedChanges, document);

        await elevateRelatedDocumentsRights(documentRef, JSON.parse(JSON.stringify(requestedChanges)), context, transaction);

        console.log(documentRef.path + ' (1): ' + JSON.stringify(access));
        transaction.update(documentRef, {access});

    }

    // ... or decrease rights
    else {

        await decreaseRights(documentRef, requestedChanges, transaction, context);

    }
}

/**
 * Decrease the rights of the document and its related documents
 *
 * @param documentRef to the document
 * @param requestedChanges to the access data
 * @param transaction: the current transaction to perform writes in
 * @param context of the cloud function call
 *
 */
async function decreaseRights(
    documentRef: FirebaseFirestore.DocumentReference,
    requestedChanges: AccessChange,
    transaction: FirebaseFirestore.Transaction,
    context: functions.https.CallableContext) {

    const collectionName = documentRef.parent.id;

    // update accessData in document

    switch (collectionName) {

        case 'meals':

            // for recipes...
            // check if recipe is used in a meal with higher access rights
            // decrease to lowest access right possible

            const recipeRefs = await db.collection('recipes/')
                .where('used_in_meals', 'array-contains', documentRef.id).get();

            await Promise.all(recipeRefs.docs.map(async (doc) => {

                let minimumRights = JSON.parse(JSON.stringify(requestedChanges.requestedAccessData));
                await Promise.all((doc.data() as FirestoreRecipe).used_in_meals
                    .filter(mealId => mealId !== documentRef.id) // exclude current meal
                    .map(async mealId => {
                        const changes = {
                            documentPath: '',
                            requestedAccessData: minimumRights,
                            upgradeOnly: true
                        }
                        const meal = await transaction.get(db.doc('meals/' + mealId));
                        minimumRights = generateNewAccessData(changes, meal);
                    }));

                const newRights = JSON.parse(JSON.stringify(requestedChanges.requestedAccessData));

                // define minimal rights
                for (const uid in newRights) {
                    if (isElevation(newRights[uid], minimumRights[uid])) {
                        newRights[uid] = minimumRights[uid];
                    }
                }
                const changesToRecipe: AccessChange = {
                    documentPath: 'recipes/' + doc.id,
                    requestedAccessData: newRights,
                    upgradeOnly: false
                }

                // catch exceptions, it may not be possible to decrease the rights of the recipes
                try {
                    await changeAccessDataWithTransaction(transaction, JSON.parse(JSON.stringify(changesToRecipe)), context, documentRef.id);
                } catch (error) {
                    console.log(error);
                }

            }));

            // update accessData in document
            console.log(documentRef.path + '(2): ' + JSON.stringify(requestedChanges.requestedAccessData));
            transaction.update(documentRef, {access: requestedChanges.requestedAccessData});

            break;

        case 'recipes':

            // update accessData in document
            console.log(documentRef.path + '(3): ' + JSON.stringify(requestedChanges.requestedAccessData));
            transaction.update(documentRef, {access: requestedChanges.requestedAccessData});

            break;

        // change nothing
        default:
            throw new Error('Decreasing rights of a user on this document type is not supported!');


    }

}

/**
 * Elevates rights of related documents
 *
 * @param documentRef
 * @param requestedChanges
 * @param context
 * @param transaction
 *
 */
async function elevateRelatedDocumentsRights(
    documentRef: FirebaseFirestore.DocumentReference,
    requestedChanges: AccessChange,
    context: functions.https.CallableContext,
    transaction: FirebaseFirestore.Transaction) {

    const collectionName = documentRef.parent.id;

    switch (collectionName) {

        // elevate the rules of users in all related meals and specificMeals and specificRecipes
        case 'camps':
            throw new Error('Share camps not yet supported!');

        // elevate the rules of users in all related recipes
        case 'meals':

            // refs of recipes used in this meal
            const docRefs = await db.collection('recipes')
                .where('used_in_meals', 'array-contains', documentRef.id).get();

            // update rights for each recipe
            await Promise.all(docRefs.docs.map(async (recipeRef) => {
                const recipeChanges = {
                    upgradeOnly: true,
                    documentPath: 'recipes/' + recipeRef.id,
                    requestedAccessData: requestedChanges.requestedAccessData
                };

                // changing the rights of a meal may not be possible
                try {
                    await changeAccessDataWithTransaction(transaction, JSON.parse(JSON.stringify(recipeChanges)), context, documentRef.id);
                } catch (error) {
                    console.log(error);
                }

            }));

            break;

        // e.g. "recipes" do nothing
        default:
            break;

    }

}


/**
 *
 * Checks if the changes to the accessData for this document is valid.
 * This function defines all security rules related to change access of a document!
 *
 * @param document to apply the changes
 * @param requestedAccessData requested changes to the accessData
 * @param context of the function call
 * @param parentId
 *
 */
async function isValidChange(
    document: FirebaseFirestore.DocumentSnapshot,
    requestedAccessData: AccessData,
    context: functions.https.CallableContext,
    parentId: string | undefined) {

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
    if (containsOnlyElevations(documentData, requestedAccessData))
        return true;

    // Check decreasing of the rules
    const collectionName = document.ref.parent.id;
    switch (collectionName) {

        case 'meals':

            // generate minimum rights for this meal
            const usedInCamps = (documentData as FirestoreMeal).used_in_camps;
            let minimumRights: AccessData = {};

            // meal isn't used in any camp
            if (usedInCamps !== undefined) {
                await Promise.all(usedInCamps.map(async (campId) => {

                    const changes = {
                        documentPath: '',
                        requestedAccessData: minimumRights,
                        upgradeOnly: true
                    }

                    minimumRights = generateNewAccessData(changes, await db.doc(campId).get());

                }));
            }
            // check if rights can be decreased
            for (const userId in requestedAccessData) {
                if (minimumRights[userId] !== undefined &&
                    !isElevation(requestedAccessData[userId], minimumRights[userId])) {
                    throw new Error('Decreasing not allowed! There exist a camp with higher rights!');
                }
            }

            return true;

        // Check for recipes
        case 'recipes':

            // checks if the decreased rights are higher than the rights in all related documents
            const usedInMeals = (documentData as FirestoreRecipe).used_in_meals;
            await Promise.all(usedInMeals
                .filter(mealId => mealId !== parentId)
                .map(async (mealId) => {

                    const docData = (await db.doc('meals/' + mealId).get()).data() as FirestoreMeal;

                    // Parent document can keep its rights
                    // i.g. the rights in the child document stays lower
                    for (const userID in docData.access) {
                        if (!isElevation(docData.access[userID], requestedAccessData[userID]))
                            throw new Error('Decreasing not allowed! There exist a meal with higher rights!');
                    }

                }));

            return true;

        // default not allowed
        default:
            throw new Error('Decreasing rights of a user on this document type is not supported!');

    }

}

/**
 *
 *
 * @param doc
 * @param reqAccess
 *
 */
function containsOnlyElevations(doc: FirestoreDocument, reqAccess: AccessData) {

    let onlyElevations = true;
    for (const uid in doc.access) {
        onlyElevations = onlyElevations && isElevation(doc.access[uid], reqAccess[uid])
    }
    return onlyElevations;

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

    // only upgrades rights
    if (requestedChanges.upgradeOnly) {

        const oldAccess = (document.data() as FirestoreDocument).access;

        // check for every user currently has access
        for (const uid in oldAccess) {

            // access data stays untouched
            if (requestedChanges.requestedAccessData[uid] === undefined) {
                requestedChanges.requestedAccessData[uid] = oldAccess[uid];
            }
            // copy higher rights to requestedChanges.requestedAccessData
            else if (!isElevation(oldAccess[uid], requestedChanges.requestedAccessData[uid])) {
                requestedChanges.requestedAccessData[uid] = oldAccess[uid];
            }

        }

    }

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

    return oldRule === 'editor' && newRule === 'owner';

}

