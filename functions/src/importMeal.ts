/*

// Used for local testing
console.log('Launch importMeal...')
console.log()
importMeal({url: "https://fooby.ch/de/rezepte/18597/randenbrot?startAuto1=4"})
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
        for (let j = nameElement ? 1 : 0; j < ingredientsDom.length; j++) {


            let ingredient = {};


            const food = ingredientsDom[j].querySelector("span.recipe-ingredientlist__ingredient-desc").innerHTML;


            const measure = ingredientsDom[j].querySelector("span.recipe-ingredientlist__ingredient-quantity > span").innerHTML;

            // Remove child
            ingredientsDom[j].querySelector("span.recipe-ingredientlist__ingredient-quantity").removeChild(ingredientsDom[j].querySelector("span.recipe-ingredientlist__ingredient-quantity > span"))
            const unit = ingredientsDom[j].querySelector("span.recipe-ingredientlist__ingredient-quantity").innerHTML


            ingredient = {food, measure, unit};


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

            let ingredient = {};

            // new version
            if (foodElement) {
                const food = foodElement.innerHTML;
                const amountElement = ingredientElement.querySelector("td.Ingredient--amount");
                const amount = amountElement ? amountElement.innerHTML : '';
                ingredient = {food, amount};

            }
            // old version
            else {
                const parts = ingredientElement.querySelectorAll("td.Ingredient--text > span");

                let food = '';
                let amount = '';
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

                ingredient = {food, amount};

            }

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
