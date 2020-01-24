import { db } from ".";

/**
 * 
 * This function creates for the user a new document "users/{userId}".
 * 
 * @param user User for which the doc should get created
 * 
 */
export function onUserCreation() {

    return (user: any) => {

        const userData = {
            displayName: user.displayName,
            email: user.email,
            visibility: 'visible'
        };

        // adds the user to the database
        db.collection('users').doc(user.uid).set(userData)
            .then(() => console.log('Added user ' + user.displayName))
            .catch(e => console.error(e));

        return true;

    };

}
