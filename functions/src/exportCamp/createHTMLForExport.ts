import { ExportedCamp } from "../interfaces/exportDatatypes";

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
export const createHTML = (camp: ExportedCamp) => {


    let dom = document.querySelector('.val-camp-name') as Element;
    dom.innerHTML = camp.camp_name;

    dom = document.querySelector('.val-current-date') as Element;
    dom.innerHTML = 'Version vom ' + new Date().toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Zurich' });

    // set Vegis and participants
    dom = document.querySelector('.val-vegis') as Element;
    dom.innerHTML = camp.camp_vegetarians.toString();
    dom = document.querySelector('.val-participants') as Element;
    dom.innerHTML = camp.camp_participants.toString();

    // set camp description 
    dom = document.querySelector('.val-description') as Element;
    dom.innerHTML = camp.camp_description;

    // set Dauer
    dom = document.querySelector('.val-dauer') as Element;
    dom.innerHTML = new Date(camp.days[0].day_date_as_date).toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Zurich' }) +
        ' bis ' + new Date(camp.days[camp.days.length - 1].day_date_as_date).toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Zurich' });


    dom = document.querySelector('.val-week-view-table') as Element;
    dom.innerHTML = `<p>Wochenübersicht zur Zeit nicht verfügbar!!!</p>`;

    // TODO: add WeekView!!

    // shoppingList
    const shoppingList = document.querySelector('.shopping-list') as Element;

    for (const category of camp.shoppingList) {

        const tbody = document.createElement('tbody');
        tbody.classList.add('category');

        const titleTr = document.createElement('tr');
        const titleTh = document.createElement('th');
        titleTh.classList.add('var-category-title');
        titleTh.innerText = category.categoryName;
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
    for (const day of camp.days) {

        for (const meal of day.meals) {

            const newPage = document.createElement('article');
            newPage.classList.add('page');
            newPage.classList.add('meal-page');
            newPage.innerHTML = `
            <h1 class="page-title meal-name">` + meal.meal_name + `</h1>
            <span class="meal-description">` + meal.meal_description + `</span>
            <span class="meal-date">` + new Date(meal.meal_data_as_date).toLocaleDateString('de-CH', { weekday: 'long', month: 'long', day: '2-digit', timeZone: 'Europe/Zurich' }) + `</span>
            <span class="meal-usedAs">` + meal.meal_used_as + `</span>`;

            const recipesNode = document.createElement('div');
            recipesNode.classList.add('recipes');

            for (const recipe of meal.recipes) {

                const newRecipe = document.createElement('div');
                newRecipe.classList.add('recipe');
                newRecipe.innerHTML = `
            <h2 class="recipe-name">`+ recipe.recipe_name + `</h2>
            <span class="recipe-description">`+ recipe.recipe_notes + `</span>
            <span class="recipe-vegi-info">`+ recipe.recipe_used_for + ` ( ` + recipe.recipe_participants + ` Personen)</span>
            <span class="recipe-notes">` + recipe.recipe_notes + `</span>`;

                const ingredientsNode = document.createElement('div');
                ingredientsNode.classList.add('ingredients');

                ingredientsNode.innerHTML = `
             <div class="ingredient" style="font-weight: bold;margin-bottom: 12px;">
             <span class="ingredient-measure">1 Per.</span>
             <span class="ingredient-measure-calc"> ` + recipe.recipe_participants + ` Per. </span>
             <span class="ingredient-unit"></span>
             <span class="ingredient-food">Lebensmittel</span></div>`;

                for (const ingredient of recipe.ingredients) {

                    const newIngredient = document.createElement('div');
                    newIngredient.classList.add('ingredient');
                    newIngredient.innerHTML = `
                <span class="ingredient-measure">`+ (ingredient.measure * 1).toFixed(2) + `</span>
                <span class="ingredient-measure-calc">`+ (ingredient.measure * recipe.recipe_participants).toFixed(2) + `</span>
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

    }

};