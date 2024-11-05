import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ToolMessage } from '@langchain/core/messages/tool'
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import terminalImage from 'terminal-image';

const tools = [new TavilySearchResults({maxResults: 4})];
// Let's check the tool is set up
/*
console.log(tools[0].constructor.name);
console.log(tools[0].name);
*/

// First we define the state
const AgentState = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => []
	})
});

// Now the system prompt
const system = `You are a smart research assistant. Use the search engine to look up information.
You are allowed to make multiple calls (either together or in sequence).
Only look up information when you are sure of what you want.
If you need to look up some information before asking a follow up question, you are allowed to do that!`;

// Now the model we will use
const model = new ChatOpenAI({model: 'gpt-3.5-turbo'}).bindTools(tools);

// Here is where we construct the graph
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
	.compile();

// We can visualise the graph
/*
const graphImg = await abot.graph.getGraph().drawMermaidPng();
const graphImgBuffer = await graphImg.arrayBuffer();
console.log(await terminalImage.buffer(new Uint8Array(graphImgBuffer)));
*/

// Now lets call the agent with a question
const messages = [new HumanMessage('What is the weather in sf?')];

const result = await graph.invoke({messages: messages});
console.log('Final result: ' + JSON.stringify(result));


// This is the function for the conditional edge
function existsAction(state) {
	console.log('existsAction, called');
	console.log(state);
	const result = state.messages[state.messages.length-1];
	//console.log(result);
	return result.toolCalls.length > 0;
}

// This is the function for the llm node
async function callOpenAi(state) {
	console.log('callOpenAi, called');
	let messages = state.messages;

	if (system) {
		messages = [new SystemMessage(system), ...messages];
	}
	//console.log('callOpenAi, messages: ' + JSON.stringify(messages));
	const message = await model.invoke(messages);
	//console.log('callOpenAi, message: ' + JSON.stringify(message));
	return {message: [message]};

}

// This is the function for the action node
async function takeAction(state) {
	console.log('takeAction, called');
	const results = [];
	const toolCalls = state.messages[state.messages.length-1].toolCalls;
	let result = null;

	for (const t in toolCalls) {
		console.log('Calling: ' + t);

		if (!(t in tools)) {
			console.log('\n...bad tool name...');
			result = 'bad tool name, retry';
		} else {
			result = await tools[t.name](t.args);
		}

		results.push(new ToolMessage({toolCallId: t.id, name: t.name, content: result.toString()}));
	}

	console.log('Back to the model!');
	return {messages: results};
}
