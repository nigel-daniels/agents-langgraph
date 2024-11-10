import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ToolMessage } from '@langchain/core/messages/tool'
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import terminalImage from 'terminal-image';

const tools = [new TavilySearchResults({maxResults: 4})];

// Let's check the tool is set up
console.log(tools[0].constructor.name);
console.log(tools[0].name);


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

const graphImg = await graph.getGraph().drawMermaidPng();
const graphImgBuffer = await graphImg.arrayBuffer();
console.log(await terminalImage.buffer(new Uint8Array(graphImgBuffer)));


/*
// Now lets call the agent with a question
const messages1 = [new HumanMessage('What is the weather in sf?')];

const result1 = await graph.invoke({messages: messages1});
console.log('Final result: ' + JSON.stringify(result1));
console.log('\nResult: ' + result1.messages[result1.messages.length-1].content);
*/

/*
// Let's try a more complex question
const messages2 = [new HumanMessage('What is the weather in SF and LA?')];

const result2 = await graph.invoke({messages: messages2});
console.log('Result: ' + result2.messages[result2.messages.length-1].content);
*/

/*
// Let's try a complex question where there is a demendency between the question results
const messages3 = [new HumanMessage('Who won the super bowl in 2024? ' +
	'In what state is the winning team headquarters located? ' +
	'What is the GDP of that state? Answer each question.')];

const result3 = await graph.invoke({messages: messages3});
console.log('Result: ' + result3.messages[result3.messages.length-1].content);
*/



///////// FUNCTIONS USED BY THE GRAPH //////////
// This is the function for the conditional edge
function existsAction(state) {
	const result = state.messages[state.messages.length-1];

	return result.tool_calls.length > 0;
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
