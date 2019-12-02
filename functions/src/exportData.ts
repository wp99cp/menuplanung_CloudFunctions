import { ResponseData } from "./interface-responseData";
import * as functions from 'firebase-functions';
import * as  admin from 'firebase-admin';

// connect to database
admin.initializeApp(functions.config().firebase);
const db = admin.firestore();

/**
 * 
 * @param requestData 
 */
export function createCampExportData(requestData: functions.https.Request): Promise<ResponseData> {

    const campId = 'q9FLvzunhX8idSpnp5Us'; // requestData.params.campId;
    return new Promise((resolve, reject) =>

        // load data form the database
        db.doc('camps/' + campId).get()
            .then(snapshot => {

                // create the DataObject for the return
                const createDataObject = { data: snapshot.data() };
                resolve(createDataObject);

            })
            .catch(err => reject(err)
            )
    );

};

/**
 * 
 */
export function createShoppingListData(): Promise<ResponseData> {
    return Promise.resolve({
        data: [
            {
                name: 'Fleisch',
                ingredients: [
                    {
                        food: 'Hackfleisch',
                        unit: 'kg',
                        measure: '2'
                    }, {
                        food: 'Brätchügeli',
                        unit: 'kg',
                        measure: '1'
                    }, {
                        food: 'Brätchügeli',
                        unit: 'kg',
                        measure: '1'
                    }
                ]
            },
            {
                name: 'Gemüse und Früchte',
                ingredients: [
                    {
                        food: 'Apfel',
                        unit: 'kg',
                        measure: '2'
                    }
                ]
            }
        ]
    });
}

/**
 * 
 */
export function createMealsInfoData(): Promise<ResponseData> {
    return Promise.resolve({
        data: {
            name: 'Zmittag',
            meal: 'Hörndli und Ghacktes',
            date: 'Mittwoch, 30. November 2019',
            recipes: [
                {
                    name: 'Hörndli und Ghacktes'
                }
            ]
        }
    });
}
