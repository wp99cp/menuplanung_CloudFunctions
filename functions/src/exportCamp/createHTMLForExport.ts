/**
 * 
 * Manipulates the HTML file "lagerhandbuch.html" to create a
 * HTML document for printing the lagerhandbuch.
 * 
 * This function get exicuted in a browser environment in puppeteer.
 * 
 * @param data exportedCamp Data
 * 
 */
export const createHTML = (data: any) => {

    let dom = document.querySelector('.val-camp-name') as Element;
    dom.innerHTML = data.campData.name;

    dom = document.querySelector('.val-current-date') as Element;
    dom.innerHTML = 'Version vom ' + new Date().toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    dom = document.querySelector('.val-description') as Element;
    dom.innerHTML = data.campData.description;

    // weekView
    dom = document.querySelector('.val-week-error') as Element;
    dom.innerHTML = data.weekView.error;

    dom = document.querySelector('.val-week-view-table') as Element;
    dom.innerHTML = `<p>Wochenübersicht zur Zeit nicht verfügbar!!!</p>`;

    // shoppingList
    const shoppingList = document.querySelector('.shopping-list') as Element;

    for (const error of data.shoppingList.error) {

        const span = document.createElement('span');
        span.classList.add('shoppinglist-error');
        span.innerText = error;
        shoppingList.appendChild(span);

    }

    for (const category of data.shoppingList.shoppingList) {

        const tbody = document.createElement('tbody');
        tbody.classList.add('category');

        const titleTr = document.createElement('tr');
        const titleTh = document.createElement('th');
        titleTh.classList.add('var-category-title');
        titleTh.innerText = category.name;
        titleTr.appendChild(titleTh);
        tbody.appendChild(titleTr);

        for (const ingredient of category.ingredients) {

            const ingredientTr = document.createElement('tr');
            ingredientTr.classList.add('ingredient');
            ingredientTr.innerHTML = `
                <td class="measure var-measure"> `+ ingredient.measure + `  </td>
                <td class="unit var-unit"> `+ ingredient.unit + `  </td>
                <td class="food var-food"> `+ ingredient.food + `  </td>`;

            tbody.appendChild(ingredientTr);
        }

        shoppingList.appendChild(tbody);

    }

    // add Meals
    dom = document.body;
    for (const meal of data.mealsInfo) {

        const newPage = document.createElement('article');
        newPage.classList.add('page');
        newPage.classList.add('meal-page');
        newPage.innerHTML = `
            <h1 class="page-title meal-name">` + meal.name + `</h1>
            <span class="meal-description">` + meal.description + `</span>
            <span class="meal-date">` + new Date(meal.date).toLocaleDateString('de-CH', { weekday: 'long', month: 'long', day: '2-digit' }) + `</span>
            <span class="meal-usedAs">` + meal.usedAs + `</span>`;

        const recipesNode = document.createElement('div');
        recipesNode.classList.add('recipes');

        for (const recipe of meal.recipes) {

            const newRecipe = document.createElement('div');
            newRecipe.classList.add('recipe');
            newRecipe.innerHTML = `
            <h2 class="recipe-name">`+ recipe.name + `</h2>
            <span class="recipe-description">`+ recipe.description + `</span>
            <span class="recipe-vegi-info">`+ recipe.vegi + ` ( ` + recipe.participants + ` Personen)</span>
            <span class="recipe-notes">` + recipe.notes + `</span>`;

            const ingredientsNode = document.createElement('div');
            ingredientsNode.classList.add('ingredients');

            ingredientsNode.innerHTML = `
             <div class="ingredient" style="font-weight: bold;margin-bottom: 12px;">
             <span class="ingredient-measure">1 Per.</span>
             <span class="ingredient-measure-calc"> ` + recipe.participants + ` Per. </span>
             <span class="ingredient-unit"></span>
             <span class="ingredient-food">Lebensmittel</span></div>`;

            for (const ingredient of recipe.ingredients) {

                const newIngredient = document.createElement('div');
                newIngredient.classList.add('ingredient');
                newIngredient.innerHTML = `
                <span class="ingredient-measure">`+ Number.parseFloat(ingredient.measure).toFixed(2) + `</span>
                <span class="ingredient-measure-calc">`+ (ingredient.measure * recipe.participants).toFixed(2) + `</span>
                <span class="ingredient-unit">`+ ingredient.unit + `</span>
                <span class="ingredient-food">`+ ingredient.food + `</span>`;

                ingredientsNode.appendChild(newIngredient);
            }

            newRecipe.appendChild(ingredientsNode);
            recipesNode.appendChild(newRecipe);
        }

        newPage.appendChild(recipesNode);
        dom.appendChild(newPage);

    }

};