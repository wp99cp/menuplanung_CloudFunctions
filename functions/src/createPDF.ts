import { ResponseData } from './interface-responseData';
import admin = require('firebase-admin');
import { projectId } from '.';
import { contents } from './htmlContentLagerhandbuch';
import { exportCampData } from './exportData';

/**
 * 
 * Saves a PDF to the cloudStorage.
 * 
 * This function creates a PDF as the Lagerhandbuch for the campId in the requestData object
 * using puppeteer and an headless chrome instance to print a static html page filled in with
 * the exportedData form the requested camp.
 *
 */
export async function createPDF(requestData: any): Promise<ResponseData> {

    // load dependecies for creating a pdf with puppeteer
    const puppeteer = require('puppeteer');

    // start creating the pdf with puppeteer
    // creating a new instance of an headless chrome browser to print the document
    // and save it as a PDF in the cloudStorage
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // sets the content of the page loaded in the browser
    await page.setContent(contents);
    // use print media for print css
    await page.emulateMedia("print");

    // Update the data from the template...
    const exportData = (await exportCampData(requestData)).data;
    await page.evaluate(fillingInData, exportData);

    // generates the file path out of the campId a unique token
    const filePath = generatingFileName(requestData.campId);

    // saves the page as PDF
    await saveAsPDF(page, filePath, (err: any) => {
        if (!err) {
            // File written successfully.
            console.log('pdf file written successfully');
        }
    });

    return { data: filePath };

}

/**
 * 
 * Filling in the data to the html page
 * 
 * @param data exportedCamp Data
 * 
 */
const fillingInData = (data: any) => {

    let dom = document.querySelector('.val-camp-name') as Element;
    dom.innerHTML = data.campData.name;

    dom = document.querySelector('.val-current-date') as Element;
    dom.innerHTML = 'Version vom ' + new Date().toLocaleDateString('de-CH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    dom = document.querySelector('.val-description') as Element;
    dom.innerHTML = data.campData.description;

};

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
    return 'eMeal-export/' + campName + '_' + exportToken + '.pdf';

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

    // loads the cloudStorage default bucket
    const cloudStorage = admin.storage().bucket(projectId + '.appspot.com');

    // custom print settings
    const printOptions = {
        printBackground: true,
        format: "A4",
        margin: { top: "2cm", right: "1.75cm", bottom: "2.5cm", left: "1.75cm" },
    };

    // create a pdf with the custom print settings
    const pdfBuffer = await page.pdf(printOptions);

    // saves the file in the cloudStorage
    const pdfFile = cloudStorage.file(filePath);
    const fileMetadata = { contentType: 'application/pdf' };
    pdfFile.save(pdfBuffer, fileMetadata, callback);

}
