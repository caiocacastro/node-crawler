import express, { json } from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const api = express();

interface ComicInterface {
  id: string;
  url: string;
  name: string;
}

const jsonDataFile = "responseData.json";
const cache = false;

const getHtml = async (url: string, comic?: boolean) => {
  if (cache) {
    if (comic) return fs.readFileSync("cacheComic.html").toString();
    return fs.readFileSync("cachePage.html").toString();
  } else {
    const page = await fetch(url);
    return await page.text();
  }
};

const getComicList = async (baseUrl: string) => {
  const comicList = await getHtml(`${baseUrl}/comics/oots.html`);
  saveJsonData(comicList, baseUrl);
};

const loadData = (): ComicInterface[] => JSON.parse(fs.readFileSync(jsonDataFile).toString());

const getComicImage = async (id: string) => {
  const jsonData: ComicInterface[] = loadData();

  const comic = jsonData.find((c) => parseInt(c.id) === parseInt(id));

  if (comic) {
    const comicPage = await getHtml(comic.url);

    const page = cheerio.load(comicPage);

    let imgSource = "";

    page("img").each((i, title) => {
      // console.log(page(title));
      const src = page(title).attr("src");
      if (src && src.includes("/oots/")) imgSource = src;
    });

    return imgSource;
  }
};

const saveJsonData = (comicList: string, baseUrl: string) => {
  const page = cheerio.load(comicList);
  const comiObjectList: ComicInterface[] = [];

  page(".ComicList > a").each((i, title) => {
    const aLink = page(title);
    const url = aLink.attr("href")!;

    const comic: ComicInterface = {
      id: url.split("oots")[1].split(".")[0],
      name: aLink.html() ?? "",
      url: `${baseUrl}${url}`,
    };

    comiObjectList.push(comic);
  });

  fs.writeFileSync(jsonDataFile, JSON.stringify(comiObjectList));

  console.log(`done write ${comiObjectList.length} comics`);
};

api.get("/loadComics", async () => {
  const baseUrl = "http://www.giantitp.com";

  getComicList(baseUrl);
});

api.get("/getComicList", async (req, resp) => {
  const jsonData = loadData();
  resp.json(jsonData.reduce((atts, att) => ({ ...atts, [att.id]: { ...att } }), {}));
});

api.get("/getComic", async (req, resp) => {
  const { id } = req.query;

  resp.end(JSON.stringify({ img: await getComicImage(id as string) }));
  // resp.sendFile((await getComicImage(id as string)) ?? "");
});

api.listen(3000, () => console.log("running server on por 3000"));
