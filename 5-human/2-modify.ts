import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import { MessageUnion, SystemMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { ToolMessage } from '@langchain/core/messages/tool'
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { v4 as uuid4 } from 'uuid';
import confirm from '@inquirer/confirm';

// Here we set up the parts we need for the agent

// First define the memory for persistance
const memory = SqliteSaver.fromConnString(':memory:');

// Set up the tools
const tools = [new TavilySearchResults({maxResults: 2})];

// First we define the state (with a custom reducer)
const AgentState = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		reducer: (left, right) => reduceMessages(left, right), // See below for function
		default: () => []
	})
});

// Now the system prompt
const system = `You are a smart research assistant. Use the search engine to look up information.
You are allowed to make multiple calls (either together or in sequence).
Only look up information when you are sure of what you want.
If you need to look up some information before asking a follow up question, you are allowed to do that!`;

// Now the model we will use
const model = new ChatOpenAI({
	model: 'gpt-3.5-turbo',
}).bindTools(tools);


// Now we can construct our agent graph
const graph = new StateGraph(AgentState)
	.addNode('llm', callOpenAi) // See below for function
	.addNode('action', takeAction) // See below for function
	.addConditionalEdges(
		'llm',
		existsAction, // See below for function
		{true: 'action', false: END}
	)
	.addEdge('action','llm')
	.setEntryPoint('llm')
	.compile({
		checkpointer: memory,
		interruptBefore: ['action']
	});

const messages = [new HumanMessage('What is the weather in LA?')];

const config = {
	configurable: {thread_id: '2'}
};

for await (const event of await graph.stream({messages: messages}, config)) {
	for (const [node, values] of Object.entries(event)) {
		console.log('\nStreaming:')
		console.log(values.messages);
	}
}

let currentValues = await graph.getState(config);

// This is the current state
console.log(currentValues.values);
// Here is the message we want to modify
console.log(currentValues.values.messages[currentValues.values.messages.length-1]);
// In fact this is the part of the message we want change
console.log(currentValues.values.messages[currentValues.values.messages.length-1].tool_calls);
// The state returned at this point now hase a human message without an id!

// Store the tool_call ID
const _id = currentValues.values.messages[currentValues.values.messages.length-1].tool_calls[0].id;
// Now let's replace the tool call with our own, updating the query but preserving the ID
currentValues.values.messages[currentValues.values.messages.length-1].tool_calls = [{
	name: 'tavily_search_results_json',
  	args: {
		input: 'current weather in Louisiana'
	},
	type: 'tool_call',
	id: _id
}];

await graph.updateState(config, currentValues.values);

let newValues = await graph.getState(config);
console.log(newValues.values);

for await (const event of await graph.stream(null, config)) {
	for (const [node, values] of Object.entries(event)) {
		console.log(values.messages);
	}
}


///////// FUNCTIONS USED BY THE GRAPH //////////

// This is the function for the conditional edge
function existsAction(state) {
	const result = state.messages[state.messages.length-1];

	return result.tool_calls ? result.tool_calls.length > 0 : false;
}

// This is the function for the llm node
async function callOpenAi(state) {
	let messages = state.messages;

	if (system) {
		messages = [new SystemMessage(system), ...messages];
	}

	const message = await model.invoke(messages);
	return {messages: [message]};
}

// This is the function for the action node
async function takeAction(state) {
	const results = [];
	const toolCalls = state.messages[state.messages.length-1].tool_calls;
	let result = null;

	for(const t of toolCalls) {
		console.log('Calling: ' + JSON.stringify(t));
		if (tools.some(tool => tool.name === t.name)) {
			const tool = tools.find(tool => tool.name === t.name);
			result = await tool.invoke(t.args);
		} else {
			//console.log('\n...bad tool name...');
			result = 'bad tool name, retry';
		}
		results.push(new ToolMessage({tool_call_id: t.id, name: t.name, content: result.toString()}));
	}
	//console.log('Back to the model!');
	return {messages: results};
}

// This function is used by the graph state to update the messages list
// This lets us update previous messages based on id (or we add them)
function reduceMessages(left: MessageUnion[], right: MessageUnion[]):MessaggeUnion[] {
	// Ensure any new messages have an id
	for (const message of right) {
		if (message.id === null || message.id === undefined) {
			message.id = uuid4();
			message.lc_kwargs.id = message.id;
		}
	}

	// Copy the current set of messages
	const merged = [...left];

	// Now check to see if the new message exists in the curren set of messages
	// if it does we update it if it does not we append it to the end ofg the array
	for (const message of right) {
		const i = merged.findIndex(existing => existing.id === message.id);

		i !== -1 ? merged[i] = message : merged.push(message);
	}

	return merged;
}
