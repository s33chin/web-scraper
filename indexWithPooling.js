const puppeteer = require('puppeteer');
const fs = require('fs');
const { MultiBar, Presets } = require('cli-progress');

// Function to create a new page or get a page from the pool
async function getPageFromPool(browser, pagePool) {
    if (pagePool.length > 0) {
        return pagePool.pop();
    }   else {
        return await browser.newPage();
    }
}
// Function to release a page back to the pool
function releasePageToPool(page, pagePool) {
    pagePool.push(page);
}
// Function to scroll down the page and grab xxxx number of person links
async function scrollAndGrabLinks(page) {
  const maxScrollAttempts = 385; // Adjust this value based on the website's behavior
  const scrollTimeout = 3000; // Adjust the waiting time based on website responsiveness
  const maxPersonLinks =7578;

  const personLinks = [];
  const multiBar = new MultiBar(
    {
      format: 'Scanning |' + '{bar}' + '| {percentage}% | ETA: {eta}s | {value}/{total}',
      hideCursor: true,
    },
    Presets.shades_grey
  );
  const progressBar = multiBar.create(maxScrollAttempts, 0);
  try {
    for (let scrollAttempt = 0; scrollAttempt < maxScrollAttempts; scrollAttempt++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight);');
      await page.waitForTimeout(scrollTimeout);

      // Extract person links
      const newLinks = await page.$$eval('.avatar a', (links) => links.map((link) => link.href));

      // Filter and add unique links to the personLinks array
      for (const link of newLinks) {
        if (personLinks.length >= maxPersonLinks) {
          return personLinks;
        }
        if (!personLinks.includes(link)) {
          personLinks.push(link);
        }
      }
      progressBar.update(scrollAttempt + 1);
    }
    
  } catch (error) {
    console.error('Error occurred while scrolling and grabbing person links:', error.message);
  } finally {
    multiBar.stop();
  }
  return personLinks;
}

// Function to scroll down the page and grab links after a specific href link is loaded
async function scrollAndGrabLinksAfterHref(page, targetHref) {
  const maxScrollAttempts = 500; // Adjust this value based on the website's behavior
  const scrollTimeout = 3000; // Adjust the waiting time based on website responsiveness

  const linksAfterTarget = [];
  let targetLinkLoaded = false;

  // Create a new progress bar
  const multiBar = new MultiBar(
    {
      format: 'Scanning |' + '{bar}' + '| {percentage}% | ETA: {eta}s | {value}/{total}',
      hideCursor: true,
    },
    Presets.shades_grey
  );

  // Create a new progress bar item
  const progressBar = multiBar.create(maxScrollAttempts, 0);
  try {
    for (let scrollAttempt = 0; scrollAttempt < maxScrollAttempts; scrollAttempt++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight);');
      await page.waitForTimeout(scrollTimeout);

      // Check if the targetHref link is loaded
      if (!targetLinkLoaded) {
        targetLinkLoaded = await page.evaluate((targetHref) => {
          const targetLink = document.querySelector(`a[href="${targetHref}"]`);
          return !!targetLink;
        }, targetHref);
      }

      // If the target link is loaded, start extracting links that follow it
      if (targetLinkLoaded) {
        console.log('Target link is loaded. Now extracting links after it...');
        const newLinks = await page.$$eval('.avatar a', (links) => links.map((link) => link.href));
        linksAfterTarget.push(...newLinks);
      }
    
      // Update the progress bar
      progressBar.update(scrollAttempt + 1);

      // Break the loop if the target link is loaded and all links have been collected
      if (targetLinkLoaded && linksAfterTarget.length >= 3500) {
        break;
      }
    }

    console.log('\nReached the end of the page or collected all available links after the target link.');
  } catch (error) {
    console.error('Error occurred while scrolling and grabbing links:', error.message);
  } finally {
    // Stop and remove the progress bar
    multiBar.stop();
  }
  return linksAfterTarget;
}


// Function to scrape data from the website
async function scrapeData() {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: false,
            ignoreHTTPSErrors: true,
            protocolTimeout: 180000,
            //executablePath: 'C:\\Program Files\\Google\\Chrome\Application\\chrome.exe', // <-- Add your Chrome path here
            args: [
                '--disable-defaults-apps',
                '--enable-gpu',
                '--use-gl=egl',
                '--aggressive-cache-discard',
                '--disable-cache',
                '--disable-application-cache',
                '--disable-offline-load-stale-cache',
                '--media-cache-size=0',
                '--disk-cache-size=0',
                '--js-flags=--max_old_space_size=8192',
            ],
    });

    const page = await browser.newPage();

      
    // Navigate to the login page
    await page.goto('https://10ksbconnect.com/login', { waitUntil: 'networkidle2' });

    // Now you can scrape data from the authenticated page with Infinite Scroll
    await page.type('#mat-input-0', 'xxxxxxx');
    await page.type('#mat-input-1', 'xxxxxxxxx');
    
    // Submit the login form
    await page.click('.mat-focus-indicator');
    console.log("Logged in");
    await page.waitForNavigation();
    
    // Now you can scrape data from the authenticated page with Infinite Scroll
    await page.goto('https://10ksbconnect.com/directory', { waitUntil: 'networkidle2'});
    console.log("Navigated to directory page");

    // Page pool and visitedUrls set
    const pagePool = [];
    const visitedUrls = new Set();

    // Scroll down the page and grab xxxx person links
    console.log('Scrolling started....');
    console.time('myTimer');
    
    //const targetHref = 'https://10ksbconnect.com/user/784167';  // <-- Add the href of the last person link on the page https://10ksbconnect.com/user/784167
    //const linksAfterTarget = await scrollAndGrabLinksAfterHref(page, targetHref);

    const personLinks = await scrollAndGrabLinks(page);
    const personData = [];
    console.log('Finished scrolling....');
    console.timeEnd('myTimer');
    console.log('Total number of persons found:', personLinks.length); // or  linksAfterTarget
    
    // Page pooling and data extraction
    console.time('myTimer');
    for (const personUrl of personLinks) {     // or  linksAfterTarget
      if (!visitedUrls.has(personUrl)) {
        visitedUrls.add(personUrl);
        const personPage = await getPageFromPool(browser, pagePool);
        await personPage.goto(personUrl, { waitUntil: 'networkidle0', timeout: 90000 });
        const personInfo = await personPage.evaluate(() => {
          const nameElement = document.querySelector('#viewUserProfileFullName');
          const emailElement = document.querySelector('#viewUserProfileEmail');
          const phoneElement = document.querySelector('#viewUserProfilePhone');
          const addressElement = document.querySelector('#viewUserProfileSchoolEducation');
          const businessNameElement = document.querySelector('#viewUserProfileCompanyName');
          const jobTitleElement = document.querySelector('#viewUserProfileJobTitle');
          const industryElement = document.querySelector('#viewUserProfileIndustryField');
          const websiteElement = document.querySelectorAll('.value a');
          const thirdElement = websiteElement[2];
          
          const name = nameElement ? nameElement.textContent.trim() : 'Not available';
          const email = emailElement ? emailElement.textContent.trim() : 'Not available';
          const phone = phoneElement ? phoneElement.textContent.trim() : 'Not available';
          const address = addressElement ? addressElement.textContent.trim() : 'Not available';
          const businessName = businessNameElement ? businessNameElement.textContent.trim() : 'Not available';
          const jobTitle = jobTitleElement ? jobTitleElement.textContent.trim() : 'Not available';
          const industry = industryElement ? industryElement.textContent.trim() : 'Not available';
          const website = thirdElement ? thirdElement.textContent.trim() : 'Not available';
          

          return { name, email, phone, website, address, businessName, jobTitle, industry, personPageUrl: window.location.href};
        });

        personData.push(personInfo);
        releasePageToPool(personPage, pagePool);
      }
    }
    console.timeEnd('myTimer');
    console.log('Total number of persons added to personData:', personData.length);

    // Save person data to a JSON file
    const jsonData = JSON.stringify(personData, null, 2);
    fs.writeFileSync('contact_data1_2.json', jsonData);
    console.log('Contact data saved to contact_data1_2.json');

  } catch (error) {
    console.error('Error occurred while scraping data:', error.message);
  } finally {
    if (browser) {await browser.close();}
  }
}

// Call the scrapeData function
scrapeData();
