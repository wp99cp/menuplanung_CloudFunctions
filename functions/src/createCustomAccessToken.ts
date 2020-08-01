import {auth} from '.';


// Used for local testing
// Execute with the following command:  export GCLOUD_PROJECT="cevizh11"
//                                      tsc functions/src/createCustomAccessToken.ts && node functions/src/createCustomAccessToken.js
// URL: https://demo.hitobito.com/oauth/authorize?response_type=code&client_id=GGCqAXRFO8_Iq-V9AdHcZwgmR-6suvIA2qsAi6LanHo&redirect_uri=https://emeal.zh11.ch&scope=email%20name
console.log('Launch createCustomAccessToken...')
console.log()
createCustomAccessToken({access_code: '4QqwEvBvYB1apiagqlBENFq3S-4fpLrvjkID72AYvJw'})
    .then(res => {
        console.log(JSON.stringify(res));
        console.log();
        console.log('End importMeal')
    });


/**
 *
 * @param access_code the access code form db.cevi.ch
 * @returns access_token for oauth
 *
 */
function createAccessToken(access_code: any): Promise<string> {

    const request = require('request');
    const oauthAccessData = require('../keys/cevi-db-oauth.json');
    console.log(oauthAccessData)

    const headers = {'Accept': 'application/json'};
    const dataString = 'grant_type=authorization_code&client_id=' + oauthAccessData.client_id +
        '&redirect_uri=' + oauthAccessData.redirect_uri +
        '&client_secret=' + oauthAccessData.client_secret +
        '&code=' + access_code;

    const options = {
        url: oauthAccessData.token_url,
        method: 'POST',
        headers: headers,
        body: dataString
    };

    return new Promise<string>(res => {

        function callback(error: any, response: any, body: any) {
            res(JSON.parse(body).access_token);
        }

        request(options, callback);

    });


}


/**
 *
 * Requests the user information form db.cevi.ch related to the given access_token.
 *
 * @param access_token for db.cevi.ch
 * @returns the user data
 *
 */
function requestUserData(access_token: string): Promise<any> {

    const request = require('request');
    const oauthAccessData = require('../keys/cevi-db-oauth.json');

    const headers = {
        'Authorization': 'Bearer ' + access_token,
        'X-Scope': 'name'
    };

    const options = {
        url: oauthAccessData.profile_url,
        headers: headers
    };

    return new Promise<any>(res => {

        function callback(error: any, response: any, body: any) {

            res(JSON.parse(body));
        }

        request(options, callback);

    });


}


/**
 *
 * Creates a custom sign in token for signing in to firebase from a access_code to db.cevi.ch.
 * It uses the profile date offed by CeviDB to create a unique id for each user.
 *
 * It uses the uid (CeviDB) and a SHA256 function for creating a unique id for firebase.
 *
 * @param requestData with the access_code for db.cevi.ch
 *
 */
export async function createCustomAccessToken(requestData: { access_code: string }): Promise<any> {

    const crypto = require('crypto-js');

    const access_token = await createAccessToken(requestData.access_code);
    if (!access_token)
        throw new Error('Creating Access token failed! Invalid access_token.')

    const user_data: any = await requestUserData(access_token);
    if (!user_data)
        throw new Error('Creating Access token failed! Invalid user_data.')

    const cevi_uid = user_data.id;
    const uid = 'CeviDB-' + crypto.SHA256(cevi_uid).toString().substring(0, 18) + '-' + cevi_uid;
    console.log(uid);

    // user exist
    return new Promise(res =>
        auth.getUser(uid)
            .then(() => {
                res(auth.createCustomToken(uid));

            }).catch(() => {

            const userData = {
                uid,
                displayName: user_data.first_name + ' ' + user_data.last_name + (user_data.nickname !== '') ? (' v/o ' + user_data.nickname) : '',
                email: user_data.email
            };

            auth.createUser(userData)
                .then(async (userRecord) =>
                    res(await auth.createCustomToken(userRecord.uid)))
                .catch(console.log)

        }));

}
