import { StateGraph, Annotation, END } from "@langchain/langgraph";
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, SystemMessage, HumanMessage } from '@langchain/core/messages';
import { ToolMessage } from '@langchain/core/messages/tool'
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import terminalImage from 'terminal-image';

const tool = new TavilySearchResults({maxResults: 4});

// Let's check the tool is set up
/*
console.log(tool.constructor.name);
console.log(tool.name);
*/

// First we define the state
const AgentState = Annotation.Root({
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => []
	})
});

// Now the agent
class Agent {
	system = null;
	graph = null;
	tools = [];
	model = null;

	constructor(model, tools, system) {
		this.system = system;

		this.tools = tools.reduce((result = [], t) => {
			result[t.name] = t;
			return result;
		}, {});

		this.model = model.bind({functions: this.tools});

		// Here is where we construct the graph
		this.graph = new StateGraph(AgentState)
			.addNode('llm', this.callOpenAi)
			.addNode('action', this.takeAction)
			.addConditionalEdges(
				'llm',
				this.existsAction,
				{true: 'action', false: END}
			)
			.addEdge('action','llm')
			.setEntryPoint('llm')
			.compile();
	}

	// This is the function for the conditional edge
	existsAction(state) {
		const result = state.messages[state.messages.length-1];
		return result.toolCalls.length > 0;
	}

	// This is the function for the llm node
	async callOpenAi(state) {

		const messages = state.messages;

		if (this.system) {
			messages = [new SystemMessage(this.system), ...messages];
		}
		console.log(this.model);
		const message = await this.model.invoke(messages);

		return {message: [message]};
	}

	// This is the function for the action node
	async takeAction(state) {
		const results = [];
		const toolCalls = state.messages[state.messages.length-1].toolCalls;
		let result = null;

		for (const t in toolCalls) {
			console.log('Calling: ' + t);

			if (!(t in this.tools)) {
				console.log('\n...bad tool name...');
				result = 'bad tool name, retry';
			} else {
				result = await this.tools[t.name](t.args);
			}

			results.push(new ToolMessage({toolCallId: t.id, name: t.name, content: result.toString()}));
		}

		console.log('Back to the model!');
		return {messages: results};
	}

	async run (messages) {
		return await this.graph.invoke(messages);
	}
}

const prompt = `
You are a smart research assistant. Use the search engine to look up information.
You are allowed to make multiple calls (either together or in sequence).
Only look up information when you are sure of what you want.
If you need to look up some information before asking a follow up question, you are allowed to do that!
`;

const model = new ChatOpenAI({model: 'gpt-3.5-turbo'});
const abot = new Agent(model, [tool], prompt);

// We can visualise the graph
/*
const graphImg = await abot.graph.getGraph().drawMermaidPng();
const graphImgBuffer = await graphImg.arrayBuffer();
console.log(await terminalImage.buffer(new Uint8Array(graphImgBuffer)));
*/

// Now lets call the agent with a question
const messages = [new HumanMessage('What is the weather in sf?')];

const result = await abot.run({messages: messages});
console.log(result);
