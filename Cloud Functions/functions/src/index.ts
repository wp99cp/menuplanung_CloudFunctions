import * as functions from 'firebase-functions';

/**
 * 
 * Cloud functions for the eMeal application of the cevi zueri 11.
 * 
 * 
 * 
 */


/**
 * ResponseData type for httpsCallable functions
 * 
 */
interface ResponseData {
    data: any

}

/**
 * 
 * @param createResponseFunction 
 * 
 */
const createHTTPSTriggerFunctions = (createResponseFunction: (requestData: functions.https.Request) => ResponseData) => {

    return functions.https
        .onRequest((requestData, response) => {

            setAccesControlHeaders(response);
            response.send(createResponseFunction(requestData));

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

/////////////////////////////
/////////////////////////////
/////////////////////////////

exports.getMealsInfoExport = createHTTPSTriggerFunctions(() => {

    return {
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
    };

})


exports.getCampInfoExport = createHTTPSTriggerFunctions(() => {

    return {
        data: {
            data: {
                name: 'Chlauslager 2019'
            }
        }
    };

});

exports.getShoppingList = createHTTPSTriggerFunctions(() => {

    return {
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
    }

});