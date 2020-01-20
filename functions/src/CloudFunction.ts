import { ResponseData } from './interface-responseData';
import * as functions from 'firebase-functions';

type CloudFunction = (requestData: any) => Promise<ResponseData>;
type FunctionMemory = "256MB" | "128MB" | "512MB" | "1GB" | "2GB" | undefined;

/**
 *
 * TODO: export dieser Funktion in ein utils.ts document
 *
 * Creates a new https.onCall function with the basic settings
 *
 * Used region: 'europe-west1'
 *
 * @param fkt
 *
 */
export const createCallableCloudFunc = (fkt: CloudFunction, memory?: FunctionMemory) => {
    return cloudFunction(memory)
        // creat a httpsCallable function
        .https.onCall((requestData, context) => {
            // create the response and return it to the client
            return fkt(requestData);
        });
};
// TODO: export dieser Funktion in ein utils.ts document
export const cloudFunction = (memory: FunctionMemory = '256MB') => {
    return functions
        // sets the region on which the cloud functions get exicuded.
        // this region must be also set in the call of the function
        .region('europe-west1')
        // runtime setting
        .runWith({
            timeoutSeconds: 20,
            memory: memory
        });
};
