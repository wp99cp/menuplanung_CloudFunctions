import admin = require('firebase-admin');

import { db, projectId } from '..';
import { createHTML } from './createHTMLForExport';
import { exportCampData } from './exportData';
import { ResponseData } from '../interface-responseData';

/**
 * 
 * Saves a PDF to the cloudStorage.
 * 
 * This function creates a PDF as the Lagerhandbuch for the campId in the requestData object
 * using puppeteer and an headless chrome instance to print a static html page filled in with
 * the exportedData form the requested camp.
 *
 */
export async function createExportFiles(requestData: any): Promise<ResponseData> {

    // load dependecies for creating a pdf with puppeteer
    const puppeteer = require('puppeteer');

    // start creating the pdf with puppeteer
    // creating a new instance of an headless chrome browser to print the document
    // and save it as a PDF in the cloudStorage
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // loads the template html from the template folder
    await page.goto('file://' + __dirname + '/templates/lagerhandbuch.html');
    // use print media for print css
    await page.emulateMedia("print");

    // Update the data from the template...
    const exportData = (await exportCampData(requestData)).data;
    await page.evaluate(createHTML, exportData);

    // generates the file path out of the campId a unique token
    const filePath = generatingFileName(requestData.campId);

    // reads out the html content
    await saveAsHTML(page, filePath);

    // saves the page as PDF
    await saveAsPDF(page, filePath, (err: any) => {
        if (!err) {
            // File written successfully.
            console.log('pdf file written successfully');
        }
    });

    // saves the shopping list as csv
    await saveAsCSV(exportData.shoppingList, filePath);

    return await (await addDocInExportCollection(requestData.campId, filePath) as FirebaseFirestore.DocumentData).data();

}

/**
 * 
 * Writes the info about the export to the collection 'exports' of the
 * camp with the given campId.
 * 
 * @param campId Id of the exported camp 
 * @param filePath unique file path to the exported files
 */
async function addDocInExportCollection(campId: string, filePath: string): Promise<FirebaseFirestore.DocumentSnapshot> {

    const exportInfos = {
        path: filePath,
        docs: ['pdf', 'html', 'csv'],
        // now
        exportDate: new Date(),
        // one month
        expiryDate: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 30))
    };

    const docRef = await db.collection('camps/' + campId + '/exports/').add(exportInfos);
    return docRef.get();
}

/**
 * Saves the html content of the current Page as HTML
 * 
 * @param page currentPage
 * @param filePath path where the file should get saved
 */
async function saveAsHTML(page: any, filePath: string) {

    const html = await page.evaluate(() => { return (document.body.parentElement as HTMLElement).innerHTML; });

    const htmlFile = getCloudStorage().file(filePath + '.html');
    const fileMetadata = { contentType: 'application/html' };
    htmlFile.save(html, fileMetadata, (err) => { console.log(err); });

}


/**
 * Saves the shoppingList as an CSV
 * 
 * @param page currentPage
 * @param filePath path where the file should get saved
 */
async function saveAsCSV(shoppingList: any, filePath: string) {

    const { Parser } = require('json2csv');
    const fields = ['measure', 'unit', 'food', 'comment', 'category'];

    // "withBOM" for utf-8 in Excel && "eol" for open with Excel
    const opts = { fields, withBOM: true, eol: "\r\n", delimiter: ";" };

    // convert shopping list to an array
    // TODO: könnte schöner mit der flatten methode von json2csv gelöst werden
    const list: { food: string, measure: string, unit: string, category: string }[] = [];
    for (const category of shoppingList.shoppingList) {
        for (const ingredient of category.ingredients) {
            ingredient.category = category.name;
            list.push(ingredient);
        }
    }

    // convert array to csv
    const parser = new Parser(opts);
    const csv = parser.parse(list);

    const csvFile = getCloudStorage().file(filePath + '.csv');
    const fileMetadata = { contentType: 'application/csv' };
    csvFile.save(csv, fileMetadata, (err) => { console.log(err); });

}

/**
 * creates the unique fileName
 *  
 * @param campId the Id of the camp in the firebase database 
 * @returns the filePath to the created fileName
 * 
 */
function generatingFileName(campId: string) {

    const campName = campId;
    const exportToken = (Date.now().toString(36) + Math.random().toString(36).substr(2, 5)).toUpperCase();
    return 'eMeal-export/' + campName + '_' + exportToken;

}

/**
 * Creates a pdf from a webpage using puppeteer
 * 
 * @param page page to take create a pdf from
 * @param filePath path to the file
 * @param callback the SaveCallback function which gets called after the file has been saved
 *
 */
async function saveAsPDF(page: any, filePath: string, callback: any) {


    // custom print settings
    const printOptions = {
        printBackground: true,
        format: "A4",
        margin: { top: "2cm", right: "1.75cm", bottom: "2.5cm", left: "1.75cm" },
    };

    // create a pdf with the custom print settings
    const pdfBuffer = await page.pdf(printOptions);

    // saves the file in the cloudStorage
    const pdfFile = getCloudStorage().file(filePath + '.pdf');
    const fileMetadata = { contentType: 'application/pdf' };
    pdfFile.save(pdfBuffer, fileMetadata, callback);

}

/**
 * 
 * @returns the default bucket (the cloudStorage) of the current project.
 * 
 */
function getCloudStorage() {

    return admin.storage().bucket(projectId + '.appspot.com');
}

