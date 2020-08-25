import {AccessData, FirestoreDocument} from "./interfaces/firestoreDatatypes";
import {db} from "./index";

/**
 *  Changes the access of an document in the database.
 *
 */
export interface AccessChange {

    documentPath: string;
    requestedAccessData: AccessData;

}

/**
 *
 * Changes the accessData of an object in the database.
 * AccessData can't be changed directly by the user all changes are handheld by this function.
 *
 * @param requestData
 */
export async function changeAccessData(requestedChanges: AccessChange): Promise<any> {

    const documentRef = db.doc(requestedChanges.documentPath);

    return new Promise((resolve, reject) => {

        db.runTransaction(async (transaction) => {

            const document = await transaction.get(documentRef);

            // check changes
            if (!isValidChange(document, requestedChanges.requestedAccessData))
                throw new Error('Invalid access change!');

            // update accessData in document
            transaction.update(documentRef, {access: requestedChanges.requestedAccessData});

        })
            .then(() => resolve('AccessData successfully updated.'))
            .catch((error) => reject(error.message));


    });

}

/**
 *
 * Checks if the changes to the accessData for this document is valid.
 *
 * @param document to apply the changes
 * @param requestedAccessData requested changes to the accessData
 *
 */
function isValidChange(document: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>, requestedAccessData: AccessData) {

    const documentData = document.data() as (FirestoreDocument | undefined);

    if (documentData === undefined) {
        throw new Error('Invalid documentPath!');
    } else {
        
        // TODO: insert check!
        return true;

    }

}

