import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { MessageUnion, SystemMessage, HumanMessage, AIMessage, ChatMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { tavily } from '@tavily/core';
// Here we set up the parts we need for the agent

// First define the memory for persistance
const memory = SqliteSaver.fromConnString(':memory:');

// Define the state
const AgentState = Annotation.Root({
	task: Annotation<string>,
	plan: Annotation<string>,
	draft: Annotation<string>,
	critique: Annotation<string>,
	content: Annotation<string[]>,
	revision: Annotation<number>,
	maxRevisions: Annotation<number>,
});

// Now the model we will use
const model = new ChatOpenAI({
	model: 'gpt-3.5-turbo',
	temperature: 0
});

// Lets set all of the prompts up
const PLAN_PROMPT = `You are an expert writer tasked with writing a high level outline of an essay. \
Write such an outline for the user provided topic. \
Give an outline of the essay along with any relevant notes or instructions for the sections.`;

const WRITER_PROMPT = `You are an essay assistant tasked with writing excellent 5-paragraph essays. \
Generate the best essay possible for the user's request and the initial outline. \
If the user provides critique, respond with a revised version of your previous attempts. \
Utilize all the information below as needed:

------

{content}`;

const REFLECTION_PROMPT = `You are a teacher grading an essay submission. \
Generate critique and recommendations for the user's submission. \
Provide detailed recommendations, including requests for length, depth, style, etc.`;

const RESEARCH_PLAN_PROMPT = `You are a researcher charged with providing information that can \
be used when writing the following essay. Generate a list of search queries that will gather \
any relevant information. Only generate 3 queries max.`;

const RESEARCH_CRITIQUE_PROMPT = `You are a researcher charged with providing information that can \
be used when making any requested revisions (as outlined below). \
Generate a list of search queries that will gather any relevant information. Only generate 3 queries max.`;

// Define a structure for the queries
const Queries = z.object({
	queries: z.array(z.string())
});

// get the search set up
const client = tavily({apiKey: process.env.TAVILY_API_KEY});

// Now we can construct the graph
const graph = new StateGraph(AgentState)
	.addNode('planner', planNode)
	.addNode('generate', generationNode)
	.addNode('reflect', reflectionNode)
	.addNode('researchPlan', researchPlanNode)
	.addNode('researchCritique', researchCritiqueNode)
	.addEdge('planner','researchPlan')
	.addEdge('researchPlan','generate')
	.addEdge('reflect','researchCritique')
	.addEdge('researchCritique','generate')
	.addConditionalEdges(
		'generate',
		shouldContinue,
		{END: END, reflect: 'reflect'}
	)
	.setEntryPoint('planner')
	.compile({ checkpointer: memory });


// Ok let's use the graph
const thread = {
	configurable: {thread_id: '1'}
};

for await (const event of await graph.stream({
	task: 'What is the difference between LangChain and LangSmith?',
	maxRevisions: 2,
	revision: 1
}, thread)) {
	for (const [node, values] of Object.entries(event)) {
		console.log(values.messages);
	}
}
///////// FUNCTIONS USED BY THE GRAPH //////////
async function planNode(state: AgentState) {
	const messages = [
		new SystemMessage({content: PLAN_PROMPT}),
		new HumanMessage({content: state.task})
	];

	const response = await model.invoke(messages);

	return {plan: response.content};
}


async function researchPlanNode(state: AgentState) {
	const messages = [
		new SystemMessage({content: RESEARCH_PLAN_PROMPT}),
		new HumanMessage({content: state.task})
	];

	const queries = await model.withStructuredOutput(Queries).invoke(messages);

	const content = (state.content || []);

	for (const q in queries.queries) {
		const response = await client.search(q, {maxResults: 2});

		for (const r in response.results) {
			content.push(r.content);
		}
	}

	return {content: content};
}


async function generationNode(state: AgentState) {
	const content = (state.content || []).join('\n\n');

	const userMessage = new HumanMessage({content: state.task + '\n\nHere is my plan:\n\n' + state.plan});

	const messages = [
		new SystemMessage({content: WRITER_PROMPT.replace('{content}', content)}),
		userMessage
	];

	const response = await model.invoke(messages);

	return {draft: response.content, revision: state.revision++};
}


async function reflectionNode(state: AgentState) {
	const messages = [
		new SystemMessage({content: REFLECTION_PROMPT}),
		new HumanMessage({content: state.draft})
	];

	const response = await model.invoke(messages);

	return {critique: response.content};
}


async function researchCritiqueNode(state: AgentState) {
	const messages = [
		new SystemMessage({content: RESEARCH_CRITIQUE_PROMPT}),
		new HumanMessage({content: state.critique})
	];

	const queries = await model.withStructuredOutput(Queries).invoke(messages);

	const content = (state.content || []);

	for (const q in queries.queries) {
		const response = await client.search(q, {maxResults: 2});

		for (const r in response.results) {
			content.push(r.content);
		}
	}

	return {content: content};
}


function shouldContinue(state) {
	return state.revision > state.maxRevisions ? END : 'reflect';
}
