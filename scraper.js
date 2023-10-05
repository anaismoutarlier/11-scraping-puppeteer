const puppeteer = require("puppeteer");
const moment = require("moment");
const fs = require("fs").promises;

const scrap = async () => {
  try {
    var browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    // await page.setRequestInterception(true);
    // page.on("request", request => {
    //   if (["stylesheet", "image", "font"].includes(request.resourceType()))
    //     request.abort();
    //   else request.continue();
    // });

    await page.goto(
      "https://www.welcometothejungle.com/fr/jobs?refinementList%5Boffices.country_code%5D%5B%5D=FR&refinementList%5Bcontract_type%5D%5B%5D=FULL_TIME&refinementList%5Bcontract_type%5D%5B%5D=INTERNSHIP&refinementList%5Bcontract_type%5D%5B%5D=TEMPORARY&query=javascript%20developer&page=1&sortBy=mostRecent",
      {
        waitUntil: "domcontentloaded",
      }
    );

    // const totalJobs = await page.$eval(
    //   "div[data-testid='jobs-search-results-count']",
    //   el => {
    //     if (el) {
    //       return Number(el.textContent.trim());
    //     }
    //     return null;
    //   }
    // );

    const limitDate = moment().subtract(1, "days").toDate();
    console.log(limitDate);

    const jobList = await page.$$eval(
      "li.ais-Hits-list-item",
      (arr, limitDate) => {
        return arr
          .map(el => {
            const url = el.querySelector("a")?.href;
            const title = el.querySelector("h4").textContent.trim();
            const tags = Array.from(
              el.querySelectorAll("div[role='listitem']")
            ).map(item => item.textContent.trim());
            const createdAt = el.querySelector("time").dateTime;

            return { url, title, tags, createdAt };
          })
          .filter(el => new Date(el.createdAt) > new Date(limitDate));
      },
      limitDate
    );
    console.log("Found job list", jobList.length);
    for (const job of jobList) {
      await page.goto(job.url, { waitUntil: "networkidle0" });

      const data = await page.evaluate(() => {
        const data = {};
        const company = document.querySelector("div.sc-bXCLTC.dPVkkc");
        const companyUrl = company.querySelector("a").href;
        const companyName = company.textContent.trim();
        data.company = { name: companyName, url: companyUrl };
        data.sections = [
          ...document.querySelectorAll("section[data-testid*='job-section-']"),
        ].map(el => {
          const title = el.querySelector("h2")?.textContent;
          const content = [...el.querySelectorAll("p")]
            .map(p => p.textContent)
            .join("");
          return { title, content };
        });
        return data;
      });
      job.data = data;
      //   break;
    }
    // const [res1, res2] = await Promise.allSettled([
    //   page.waitForNavigation(),
    //   await page.click("li.ais-Hits-list-item a"),
    // ]);
    // console.log(res1, res2);
    await fs.writeFile(
      `./data/jobs-${Date.now()}.json`,
      JSON.stringify(jobList, null, 2)
    );
    // console.log(totalJobs);
    // console.log(jobList.length);
  } catch (error) {
    console.error(error);
  } finally {
    await browser.close();
  }
};

module.exports = scrap;
