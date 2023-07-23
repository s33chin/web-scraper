const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeData() {
  try {
    const browser = await puppeteer.launch({
      headless: false,
      ignoreHTTPSErrors: true,
      protocolTimeout: 360000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', 
        '--disable-accelerated-2d-canvas', 
        '--disable-gpu',  
        '--ignore-certificate-errors',
      ],
    });

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (req.resourceType() == 'img' || req.resourceType() == 'stylesheet' || req.resourceType() == 'font') {
        req.abort();
      } 
      else {
        req.continue();
      }
    });
    
    
    await page.goto('https://10ksbconnect.com/login', { waitUntil: 'networkidle2' });

    // Fill in login form fields
    await page.type('#mat-input-0', 'grants@cenedex.com');
    await page.type('#mat-input-1', 'Go10sb123#');

    // Submit the login form
    await page.click('.mat-focus-indicator');
    console.log("Logged in");

    // Wait for navigation to complete after successful login
    await page.waitForNavigation();
    
    // Now you can scrape data from the authenticated page with Infinite Scroll
    await page.goto('https://10ksbconnect.com/directory', { waitUntil: 'networkidle2'});
    await page.click('.mat-select-min-line.ng-tns-c67-10.ng-star-inserted', { waitUntil: 'networkidle2' });
    await page.click('.mat-option.mat-focus-indicator.ng-tns-c67-10.ng-star-inserted', { waitUntil: 'networkidle2' });

    // Scroll to the bottom of the page until no more content is loaded
    console.log('Scrolling started....');
    console.time('myTimer');
    let previousHeight = 0;
    while (true) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(4000); // wait for 4 seconds to load the next content

      const currentHeight = await page.evaluate('document.body.scrollHeight');
      if (currentHeight === previousHeight) {
        break;
      }
      previousHeight = currentHeight;
    }
    console.timeEnd('myTimer');
    console.log('Finished scrolling....');

    // Extract person details
    const personLinks = await page.$$eval(".gw-flex.gw-between a", (links) => links.map((link) => link.href));
    const personData = [];
    const visitedUrls = new Set();
    await page.close();
    console.log('Total number of persons found:', personLinks.length);
    for (const personUrl of personLinks) {
      if (!visitedUrls.has(personUrl)) {
        visitedUrls.add(personUrl);
        const personPage = await browser.newPage();
        await personPage.goto(personUrl, { waitUntil: 'networkidle0' });
    
        const personInfo = await personPage.evaluate(() => {
          const nameElement = document.querySelector('#viewUserProfileFullName');
          const emailElement = document.querySelector('#viewUserProfileEmail');
          const phoneElement = document.querySelector('#viewUserProfilePhone');
          const addressElement = document.querySelector('#viewUserProfileSchoolEducation');
          
          const name = nameElement ? nameElement.textContent.trim() : 'Not available';
          const email = emailElement ? emailElement.textContent.trim() : 'Not available';
          const phone = phoneElement ? phoneElement.textContent.trim() : 'Not available';
          const address = addressElement ? addressElement.textContent.trim() : 'Not available';
    
          return { name, email, phone, address };
        });
        personData.push(personInfo);
        await personPage.close();
      }
    }

    console.log('Total number of persons added to personData:', personData.length);

    
    const jsonData = JSON.stringify(personData, null, 2);
    fs.writeFileSync('contact_data.json', jsonData);
    console.log('Contact data saved to contact_data.json');

    await browser.close();
  } catch (error) {
    console.error('Error occurred while scraping data:', error.message);
  }

}

scrapeData();
