import { tavily } from '@tavily/core';
import ddg  from 'duckduckgo-search';
import { convert } from 'html-to-text';

const client = tavily({apiKey: process.env.TAVILY_API_KEY});


// This is just done to check were working with Tavily, the rest of the code is a regular search
const result1 = await client.search(
	'What is in Nvidia\'s new Blackwell GPU?',
	{includeAnswer: true}
);

console.log(result1.answer);

/*
// Now let's try a regular search
const city = 'San Jose, CA';

const query = `What is the current weather in ${city}?
    Should I travel there today?
    "weather.com"`

const urlList = await search(query);
const url = urlList[0];
const html = await scrapeWeatherInfo(url);

// Here's the raw result
console.log('Website: ' + url + '\n\n');
console.log(result2.slice(0,50000));
*/

/*
// Now let's atte mpt to clean up the result
const weatherData = []
const text = convert(html, {
	baseElements: {selectors: ['h1','h2','h3','p']},
	preserveNewLines: false,
	selectors: [
		{ selector: 'h1', options: { leadingLineBreaks: 0, trailingLineBreaks: 0, trimEmptyLines: true } },
		{ selector: 'h2', options: { leadingLineBreaks: 0, trailingLineBreaks: 0, trimEmptyLines: true } },
		{ selector: 'h3', options: { leadingLineBreaks: 0, trailingLineBreaks: 0, trimEmptyLines: true } },
		{ selector: 'p', options: { leadingLineBreaks: 0, trailingLineBreaks: 0, trimEmptyLines: true } },
  	]
});
const result3 = text.replace(/\r?\n|\r/g, ' ');

console.log('Website: ' + url + '\n\n');
console.log(result3);
*/

///////// FUNCTIONS USED TO MANUALLY SEARCH //////////
async function search(query, maxResults=6) {
	try {
		const ddgResults = [];

		for await (const result of ddg.text(query)) {
			ddgResults.push(result);
  		}

		const results = ddgResults.map(item => item.href);
		return results.length > maxResults ? results.slice(0, maxResults): results;
	} catch (e) {
		console.log('Returning SF results due to exception: ' + e.message);
		const results = [
			'https://weather.com/weather/today/l/USCA0987:1:US',
			'https://weather.com/weather/hourbyhour/l/54f9d8baac32496f6b5497b4bf7a277c3e2e6cc5625de69680e6169e7e38e9a8'
		];

		return results;
	}
}

async function scrapeWeatherInfo(url) {
	if (url) {
		const headers = {'User-Agent': 'Mozilla/5.0'};
		const response = await fetch(url, headers);
		const html = await response.text();

		if (response.status !== 200) {
			return 'Failed to retrieve the webpage.';
		} else {
			return html;
		}
	} else {
		return 'Weather information could not be found.';
	}
}
