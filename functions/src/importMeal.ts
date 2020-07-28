
/*

// Used for local testing
// Execute with the following command: tsc functions/src/importMeal.ts && node functions/src/importMeal.js
console.log('Launch importMeal...')
console.log()
importMeal({url: "https://www.swissmilk.ch/de/rezepte-kochideen/rezepte/SM2020_DIVE_08/linsen-dal-mit-suesskartoffeln-und-joghurt/"})
    .then(res => {
        console.log(JSON.stringify(res));
        console.log();
        console.log('End importMeal')
    });
*/

export async function importMeal(requestData: { url: string }): Promise<any> {

    // load dependencies
    const jsdom = require('jsdom');
    const request = require('request');

    // request html source code of page
    const htmlBody = await new Promise(resolve =>
        request(requestData.url, function (err: any, res: any, body: string) {
            resolve(body);
        }));

    if (typeof htmlBody === "string") {

        // create domObject
        const dom = new jsdom.JSDOM(htmlBody);
        const document = dom.window.document;

        // Parse page (Supported pages: swissmilk.ch, fooby.ch)
        if (requestData.url.includes('swissmilk.ch'))
            return parseSwissmilk(document);
        if (requestData.url.includes('fooby.ch'))
            return parseFooby(document);

        // Error: Url not supported
        return {error: 'Url not supported!'};

    } else {

        // Error: Invalid URL
        return {error: 'Invalid url!'};

    }

}

/**
 *
 * Removes fractions from the measure and returns a number (float) value.
 * E.g. ½ is replaced with 0.5.
 * Removes measurements "wenig" and replace it with 0.
 *
 * @param measure measure to be freed form fractions
 */
function convertToFloatValue(measure: string): number {

    if (measure === 'wenig')
        return 0;

    let replacedMeasure = measure;

    // replaces fractions (the HTML special character fractions) to its corresponding decimal number
    const replaceStrings = [["½", ".5"], ["¼", ".25"], ["¾", ".75"], ["⅐", ".143"], ["⅑", ".111"], ["⅒", ".1"], ["⅓", ".333"],
        ["⅔", ".666"], ["⅕", "0.2"], ["⅖", ".4"], ["⅗", "0.6"], ["⅘", ".8"], ["⅙", ".167"], ["⅛", ".125"]];
    replaceStrings.forEach(str => {
        replacedMeasure = replacedMeasure.replace(str[0], str[1]);
    });

    // removes spaces sucht that 1 .5 becomes 1.5
    replacedMeasure = replacedMeasure.replace(/\s/g, '');
    return parseFloat(replacedMeasure);

}

/**
 * Parses the HTML page of a fooby.ch meal and returns it as a JSON file.
 *
 * @param document HTML page of fooby.ch
 *
 */
function parseFooby(document: any): any {

    // Meta Data
    const duration = document.querySelector("#page-header-recipe__panel-detail > div.page-header-recipe__meta-container > div:nth-child(1) > span:nth-child(2)").innerHTML;
    const mealTitle = document.querySelector("#page-header-recipe__panel-detail > h1").innerHTML;
    const participants = document.querySelector("#portionValueSpan").innerHTML;

    // Recipes
    const recipesDom = document.querySelectorAll("body > div.t5-recipe > div.container.container--horizontal-padding-medium > div:nth-child(1) > div.col-xs-12.col-sm-4.col-md-4.h-horizontal-guttered.t5-recipe__detail-left > div.portion-calculator > div.recipe-ingredientlist > div.recipe-ingredientlist__step-wrapper");
    const names = document.querySelectorAll("body > div.t5-recipe > div.container.container--horizontal-padding-medium > div:nth-child(1) > div.col-xs-12.col-sm-4.col-md-4.h-horizontal-guttered.t5-recipe__detail-left > div.portion-calculator > div.recipe-ingredientlist > p.heading--h3");

    const recipes = [];
    for (let i = 0; i < recipesDom.length; i++) {


        // Meta Data
        const dom = recipesDom[i];

        // TODO: Parse titles!
        const nameElement = recipesDom.length === names.length ? names[i] : null;
        const recipeName = nameElement ? nameElement.innerHTML : mealTitle;

        const ingredients = [];

        // Ingredients
        const ingredientsDom = dom.querySelectorAll("div");
        for (let j = 0; j < ingredientsDom.length; j++) {

            let ingredient = {};

            // reads out the food string. Normally after a comma follows a description (i.g. the comment)
            const foodTest = ingredientsDom[j].querySelector("span.recipe-ingredientlist__ingredient-desc").innerHTML;
            const foodAndComment = foodTest.split(',')
            const food = foodAndComment[0].trim();
            const comment = foodAndComment.length > 1 ? foodAndComment[1].trim() : '';

            let measure = ingredientsDom[j].querySelector("span.recipe-ingredientlist__ingredient-quantity > span").innerHTML;
            measure = convertToFloatValue(measure);

            // Remove child (needed to read the unit)
            ingredientsDom[j].querySelector("span.recipe-ingredientlist__ingredient-quantity").removeChild(ingredientsDom[j].querySelector("span.recipe-ingredientlist__ingredient-quantity > span"))

            // read unit and remove spaces
            let unit = ingredientsDom[j].querySelector("span.recipe-ingredientlist__ingredient-quantity").innerHTML
            unit = unit.replace(/\s/g, '');

            // create ingredient and add it
            ingredient = {food, measure, unit, comment};
            ingredients.push(ingredient);

        }

        // No ingredients so skip this recipe
        if (ingredients.length === 0)
            continue;

        const recipe = {recipeName, ingredients};
        recipes.push(recipe);

    }

    return {mealTitle, participants, duration, recipes: recipes};

}

/**
 * Parses the HTML page of a swissmilk.ch meal and returns it as a JSON file.
 *
 * @param document HTML page of swissmilk.ch
 *
 */
function parseSwissmilk(document: any): any {

    // Meta Data
    const duration = document.querySelector("#main > div.RecipeDetail > section > header > div.DetailPageHeader--body > div > div.DetailPageHeader--header > ul > li.RecipeFacts--fact.duration > span").innerHTML;
    const mealTitle = document.querySelector("#main > div.RecipeDetail > section > header > div.DetailPageHeader--body > div > div.DetailPageHeader--header > h1").innerHTML;
    const participants = document.querySelector("#main > div.RecipeDetail > section > div.SplitView > div > div.SplitView--left > div > section > header > div > p > span > span").innerHTML;

    // Recipes
    const recipesDom = document.querySelectorAll("#main > div.RecipeDetail > section > div.SplitView > div > div.SplitView--left > div > section > table > tbody");
    const recipes = [];
    for (let i = 0; i < recipesDom.length; i++) {

        // Meta Data
        const dom = recipesDom[i];
        const nameElement = dom.querySelector("tr.IngredientsCalculator--group--title > th");
        const recipeName = nameElement ? nameElement.innerHTML : mealTitle;

        const ingredients = [];

        // Ingredients
        const ingredientsDom = dom.querySelectorAll("tr");
        for (let j = nameElement ? 1 : 0; j < ingredientsDom.length; j++) {

            const ingredientElement = ingredientsDom[j];
            const foodElement = ingredientElement.querySelector("th.Ingredient--text");

            let food, amount = '';

            // new version
            if (foodElement) {
                food = foodElement.innerHTML;
                const amountElement = ingredientElement.querySelector("td.Ingredient--amount");
                amount = amountElement ? amountElement.innerHTML : '';

            }
            // old version
            else {
                const parts = ingredientElement.querySelectorAll("td.Ingredient--text > span");


                if (parts.length > 1) {

                    amount = parts[0].innerHTML;
                    food = parts[1].innerHTML;


                }
                // food item without amount
                else if (parts.length === 1) {

                    food = parts[0].innerHTML;

                }
                // it's not a food item
                else
                    continue;


            }

            // parse amount
            let unit = '', measure;
            const reg = /[^a-zA-Z]*/
            const measureAndUnit = reg.exec(amount)

            // normal measure unit pair
            if (measureAndUnit !== null) {
                measure = convertToFloatValue(measureAndUnit[0]);
                amount = amount.replace(reg, '');
                unit = amount !== '' ? amount : 'Stk.';
            }

            // not "wenig", then there is only a measure
            else if (amount !== 'wenig') {
                measure = convertToFloatValue(amount);
                unit = 'Stk.'; // normally a measure without a unit is in peaces
            }

            // parses food string. Normally after a comma follows a description (i.g. the comment)
            const foodAndComment = food.split(',')
            food = foodAndComment[0].trim();
            const comment = foodAndComment.length > 1 ? foodAndComment[1].trim() : '';

            // test for null
            measure = measure ? measure : 0;

            const ingredient = {food, unit, measure, comment};
            ingredients.push(ingredient);

        }

        // No ingredients so skip this recipe
        if (ingredients.length === 0)
            continue;

        const recipe = {recipeName, ingredients};
        recipes.push(recipe);

    }

    return {mealTitle, participants, duration, recipes: recipes};

}
