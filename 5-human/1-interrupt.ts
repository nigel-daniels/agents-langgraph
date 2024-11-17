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

// First we define the state
const AgentState = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		reducer: (left, right) => reduceMessages(left, right), // Now we use the function
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
	.addNode('llm', callOpenAi)
	.addNode('action', takeAction)
	.addConditionalEdges(
		'llm',
		existsAction,
		{true: 'action', false: END}
	)
	.addEdge('action','llm')
	.setEntryPoint('llm')
	.compile({
		checkpointer: memory,
		interruptBefore: ['action']
	});

///// Human approval

// Now lets call the agent with a question
const messages1 = [new HumanMessage('What is the weather in sf?')];

const config1 = {
	configurable: {thread_id: '1'} // Used by memory to keep the converstion going
};

// Start the agent (we will stop before calling the tool)
for await (const event of await graph.stream({messages: messages1}, config1)) {
	for (const [node, values] of Object.entries(event)) {
		console.log(values.messages);
	}
}

// Let's examine the state of the graph at the interrunpted point
const state = await graph.getState(config1);
console.log(state);
console.log(state.next);


///// Continue after interrupt
/*
// Now we can let it complete by passing in null as a message, the threat_id in the config
// associates this with the state of the graph and lets it continue
for await (const event of await graph.stream(null, config1)) {
	for (const [node, values] of Object.entries(event)) {
		console.log(values);
	}
}
*/

/*
// Now let's rerun this and allow for decisions to be made
const messages2 = [new HumanMessage('What is the weather in LA?')];

const config2 = {
	configurable: {thread_id: '2'} // We use a new thread
};

for await (const event of await graph.stream({messages: messages2}, config2)) {
	for (const [node, values] of Object.entries(event)) {
		console.log(values.messages);
	}
}


let state = await graph.getState(config2);

while (state.next != '') {
	console.log('\n' + state.next + '\n');

	if (await confirm({ message: 'proceed?' })) {
		for await (const event of await graph.stream(null, config2)) {
			for (const [node, values] of Object.entries(event)) {
				console.log(values);
			}
		}
	} else {
		console.log('aborting.');
		break;
	}
	state = await graph.getState(config2);
}
*/



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
			console.log('\n...bad tool name...');
			result = 'bad tool name, retry';
		}
		results.push(new ToolMessage({tool_call_id: t.id, name: t.name, content: result.toString()}));
	}
	console.log('Back to the model!');
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
