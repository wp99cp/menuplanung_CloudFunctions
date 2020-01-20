import { db } from ".";

export function onUserCreation() {
    return (user: any) => {
        db.collection('users').doc(user.uid)
            .set({
                displayName: user.displayName,
                email: user.email,
                visibility: 'visible'
            })
            .then(() => console.log('Added user ' + user.displayName))
            .catch(e => console.error(e));
        return true;
    };
}
