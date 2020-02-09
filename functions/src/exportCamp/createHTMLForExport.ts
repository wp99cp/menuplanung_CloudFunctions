import { ExportedCamp } from '../interfaces/exportDatatypes';
import { ShoppingList } from './shopping-list';

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

    /**
     * 
     */
    const setTitlePage = function () {

        // Sets Lagerhandbuch title on the first page
        let domElm = document.querySelector('.val-camp-name') as Element;
        domElm.innerHTML = camp.camp_name;

        // sets the version on the first page
        domElm = document.querySelector('.val-current-date') as Element;
        domElm.innerHTML = 'Version vom ' + new Date().toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Zurich' });

    };

    /**
     * 
     */
    const createInfoPage = function () {

        // set Vegis and participants
        let domElm = document.querySelector('.val-vegis') as Element;
        domElm.innerHTML = camp.camp_vegetarians.toString();
        domElm = document.querySelector('.val-participants') as Element;
        domElm.innerHTML = camp.camp_participants.toString();

        // set camp description 
        domElm = document.querySelector('.val-description') as Element;
        domElm.innerHTML = camp.camp_description;

        // set Dauer
        domElm = document.querySelector('.val-dauer') as Element;
        domElm.innerHTML = new Date(camp.days[0].day_date_as_date).toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Zurich' }) +
            ' bis ' + new Date(camp.days[camp.days.length - 1].day_date_as_date).toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Zurich' });

    }

    /**
     * 
     */
    const createWeekView = function () {

        const mealUsages = ["Zmorgen", "Znüni", "Zmittag", "Zvieri", "Znacht", "Leitersnack"];

        let innerHTMLStr = '<table id="weekTable">';
        innerHTMLStr += "<tr><th></th>";
        if (camp.meals_to_prepare.length > 0) {
            innerHTMLStr += '<th> Vor dem Lager </th>';
        }
        for (const day of camp.days) {

            innerHTMLStr += '<th>' + new Date(day.day_date_as_date).toLocaleDateString('de-CH', { weekday: 'short', month: 'numeric', day: 'numeric', timeZone: 'Europe/Zurich' }) + '</th>';
        }
        innerHTMLStr += "</tr>";

        for (const mealUsage of mealUsages) {

            innerHTMLStr += '<tr><td class="usedAs">' + mealUsage + '</td>';

            if (camp.meals_to_prepare.length > 0) {
                innerHTMLStr += '<td></td>';
            }

            for (const day of camp.days) {
                innerHTMLStr += '<td class="meal_weekview_name">';

                for (const meal of day.meals) {

                    if (meal.meal_used_as === mealUsage) {
                        innerHTMLStr += '<p>' + meal.meal_weekview_name + '</p>'
                    }
                }

                innerHTMLStr += '</td>';
            }
            innerHTMLStr += "</tr>";

        }

        innerHTMLStr += '<tr><td class="usedAs"> Vorbereiten </td>';
        if (camp.meals_to_prepare.length > 0) {

            innerHTMLStr += '<td>';
            for (const meal of camp.meals_to_prepare) {
                innerHTMLStr += '<p>' + meal.meal_weekview_name + '</p>'
            }
            innerHTMLStr += '</td>';

        }

        for (const day of camp.days) {

            if (day.meals_to_prepare.length > 0) {

                innerHTMLStr += '<td>';
                for (const meal of day.meals_to_prepare) {
                    innerHTMLStr += '<p>' + meal.meal_weekview_name + '</p>'
                }
                innerHTMLStr += '</td>';

            } else {

                innerHTMLStr += '<td></td>';

            }
        }

        innerHTMLStr += '</table>';
        const domElm = document.querySelector('.val-week-view-table') as Element;
        domElm.innerHTML = innerHTMLStr;
    }


    /**
     * 
     * Creates a ShoppingList
     * 
     * @param domElm Element to insert ShoppingList
     * @param list ShoppingList
     */
    const createShoppingList = function (domElm: Element, list: ShoppingList) {

        for (const category of list) {

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
                    <td class="measure var-measure"> `+ ingredient.measure.toFixed(3) + `  </td>
                    <td class="unit var-unit"> `+ ingredient.unit + `  </td>
                    <td class="food var-food"> `+ ingredient.food + `  </td>`;

                tbody.appendChild(ingredientTr);
            }

            domElm.appendChild(tbody);

        }

    };

    const addMeals = function () {
        const dom = document.body;
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




    // Setzt das HTML File zusammen
    setTitlePage();
    createInfoPage();
    createWeekView();

    const shoppingList = document.querySelector('.shopping-list') as Element;
    createShoppingList(shoppingList, camp.shoppingList);

    addMeals();

};