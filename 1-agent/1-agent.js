import OpenAI from 'openai';

// Based on https://til.simonwillison.net/llms/python-react-pattern

// Set up an OpenAI model (Note the key is in our ENV)
const client = new OpenAI();

const chatCompletion = await client.chat.completions.create({
	model: 'gpt-3.5-turbo',
	messages: [{role: 'user', content: 'Hello world'}]
});

/*
// Check we are working ok
console.log(chatCompletion.choices[0].message.content);
*/

class Agent {
	#system = null;
	#messages = [];

	constructor(system) {
		this.#system = system;

		if (this.#system) {
			this.#messages.push({role: 'system', content: system});
		}
	}

	async call(message) {
		this.#messages.push({role: 'user', content: message});
		const result = await this.#execute();
		this.#messages.push({role: 'assistant', content: result});
		return result;
	}

	async getMessages() {
		return this.#messages;
	}

	async #execute() {
		const completion = await client.chat.completions.create({
			model: 'gpt-4o',
			temperature: 0,
			messages: this.#messages
		});

		return completion.choices[0].message.content;
	}
}

const prompt = `
You run in a loop of Thought, Action, PAUSE, Observation.
At the end of the loop you output an Answer
Use Thought to describe your thoughts about the question you have been asked.
Use Action to run one of the actions available to you - then return PAUSE.
Observation will be the result of running those actions.

Your available actions are:

calculate:
e.g. calculate: 4 * 7 / 3
Runs a calculation and returns the number

averageDogWeight:
e.g. averageDogWeight: Collie
returns average weight of a dog when given the breed

Example session:

Question: How much does a Bulldog weigh?
Thought: I should look the dogs weight using average_dog_weight
Action: average_dog_weight: Bulldog
PAUSE

You will be called again with this:

Observation: A Bulldog weights 51 lbs

You then output:

Answer: A bulldog weights 51 lbs
`.trim();

function calculate(what) {
	return eval(what);
}

function averageDogWeight(name) {
	let result = 'An average dog weights 50 lbs';

	switch (name) {
		case 'Scottish Terrier':
			result = 'A Scottish Terriers average weight is 20 lbs';
			break;
		case 'Border Collie':
			result = 'A Border Collies average weight is 37 lbs';
			break;
		case 'Toy Poodle':
			result = 'A Toy Poodles average weight is 7 lbs';
			break;
		default:
			break;
	}

	return result;
}

const knownActions = {
	calculate: calculate,
	averageDogWeight: averageDogWeight
}


/*
const aBot1 = new Agent(prompt);

// Let's try our agent out
const result1 = await aBot1.call('How much does a Toy Poodle weigh?');
console.log(result1);

// We can test if it's action would work out
const result2 = averageDogWeight('Toy Poodle');
console.log(result2);

// Now let's call it again with the reusult
const nextPrompt1 = 'Observation: ' + result2;
const result3 = await aBot1.call(nextPrompt1);
console.log(result3);

// We can check out the messages
console.log(aBot1.getMessages());
*/

/*
// Ok Now let's try a more complex series of prompts
const aBot2 = new Agent(prompt); // Let's reinitialize for a clean set of messages

const question1 = 'I have 2 dogs, a border collie and a scottish terrier.\nWhat is their combined weight?'

const result4 = await aBot2.call(question1);
console.log(result4);

const nextPrompt2 = 'Observation: ' + averageDogWeight('Border Collie');
const result5 = await aBot2.call(nextPrompt2);
console.log(result5);

const nextPrompt3 = 'Observation: ' + averageDogWeight('Scottish Terrier');
const result6 = await aBot2.call(nextPrompt3);
console.log(result6);

const nextPrompt4 = 'Observation: ' + calculate('37 + 20');
const result7 = await aBot.call(nextPrompt4);
console.log(result7);
*/

// Let's try a fully automated version of this
async function query(question, maxTurns = 5) {
	const actionRegEx = /^Action: (\w+): (.*)$/g // This will find the action string
	const bot = new Agent(prompt);
	console.log(actionRegEx);
	let i = 0;
	let nextPrompt = question;

	while (i < maxTurns) {
		i += 1;

		const result = await bot.call(nextPrompt);

		const actions = result
        	.split('\n')
			.map(a => actionRegEx.matchAll(a))
        	.filter(a => a !== null);

		if (actions.length > 0) {
			console.log(actions);
			let [_, action, actionInput] = actions[0];
			console.log(action);
			console.log(actionInput);

			if (!(action in knownActions)) {
				throw new Error(`Unknown action: ${action}: ${actionInput}`);

				console.log(` -- running ${action} ${actionInput}`);
				let observation = knownActions[action](actionInput);
				console.log('Observation:', observation);

				nextPrompt = `Observation: ${observation}`;
        	}
		} else {
			return;
		}
	}
}

const question2 = 'I have 2 dogs, a border collie and a scottish terrier.\nWhat is their combined weight?'
await query(question2);
