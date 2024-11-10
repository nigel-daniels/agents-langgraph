import { tavily } from '@tavily/core';
import ddg  from 'duckduckgo-search';
import { convert } from 'html-to-text';

const client = tavily({apiKey: process.env.TAVILY_API_KEY});

// Here is the same quesry from our regular search
const city = 'San Jose, CA';

const query = `What is the current weather in ${city}?
    Should I travel there today?
    "weather.com"`


const result = await client.search(query, {maxResults: 1});

console.log(result.results[0].content);

const json = result.results[0].content;
const parsedJson = JSON.parse(json.replaceAll('\'', '\"'));

console.log(parsedJson);
