const text = `
Thought: I need to find the average weight of a Border Collie and a Scottish Terrier, then add them together to get the combined weight.
Action: averageDogWeight: Border Collie
PAUSE
`.trim();
const regEx = new RegExp('/^Action: (\w+): (.*)$/g');

let result = text
	.split('\n')
	.map(a => regEx.matchAll(a + ''))
	;

console.log(result);
