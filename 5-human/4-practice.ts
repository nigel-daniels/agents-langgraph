import { StateGraph, Annotation, END } from '@langchain/langgraph';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';

// First we define the state
const AgentState = Annotation.Root({
	lnode: Annotation<string>,
	scratch: Annotation<string>,
	count: Annotation<number>({
		reducer: (current, update) => current += update,
		default: () => 0
	})
});

// Then some memory
const memory = SqliteSaver.fromConnString(':memory:');

// Now we can assemble the graph
const graph = new StateGraph(AgentState)
	.addNode('Node1', node1) // See below for function
	.addNode('Node2', node2) // See below for function
	.addEdge('Node1', 'Node2')
	.addConditionalEdges(
		'Node2',
		shouldContinue, // See below for function
		{true: 'Node1', false: END}
	)
	.setEntryPoint('Node1')
	.compile({ checkpointer: memory });

// Let's set up a thread
const thread1 = {
	configurable: {thread_id: '1'}
};

// Run It!
await graph.invoke({count: 0, scratch: 'hi'}, thread1);

// look at the current state
const currentState1 = await graph.getState(thread1);
console.log('The current state:');
console.log(currentState1);

// Look at the state history
console.log('\nThe state history:');
const stateHistory1 = await graph.getStateHistory(thread1);
for await (const state of stateHistory1) {
	console.log(state);
}

// Now let's store the state configs in a list
console.log('\nStoring state configs:');
const stateHistory2 = await graph.getStateHistory(thread1);
const states1 = [];
for await (const state of stateHistory2) {
	states1.push(state.config);
	console.log(state.config);
	console.log(state.values.count);
}

// Let's grab an earlier state
console.log('\nGet an earlier state config:');
const earlyState = states1[states1.length-3];
console.log(earlyState);
console.log('\nGet the full earlier state:');
const fullEarlyState = await graph.getState(earlyState);
console.log(fullEarlyState);

// Go back in time
console.log('\nRerun the graph from the earlier state:');
graph.invoke(null, earlyState);

const stateHistory3 = await graph.getStateHistory(thread1);
for await (const state of stateHistory3) {
	console.log(state.config);
	console.log(state.values.count);
}

// Modify state
// This time we'll start a new thread
const thread2 = {
	configurable: {thread_id: '2'}
};

// Run It!
console.log('Run it, then check the state:');
await graph.invoke({count: 0, scratch: 'hi'}, thread2);
const currentState2 = await graph.getState(thread1);
console.log(currentState2);

// Now let's look at the history
console.log('\nStoring new state configs:');
const stateHistory4 = await graph.getStateHistory(thread2);
const states2 = [];
for await (const state of stateHistory4) {
	states2.push(state.config);
	console.log(state.config);
	console.log(state.values.count);
}

// Again let's get a previous state:
console.log('\nSave previous state config:');
const saveState = await graph.getState(states2.length-3);
console.log(saveState);

// Now we modify that state
console.log('\nModify the previous state values:');
saveState.values.count = -3;
saveState.values.scratch = 'hello';
console.log(saveState);

console.log('\nThe updated state history:');
await graph.updateState(thread2, saveState.values);

const stateHistory5 = await graph.getStateHistory(thread2);
let i = 0;
for await (const state of stateHistory5) {
	if (i >= 3) console.log(state);
	i++;
}

// Now udate the state again but se the node to node 1
console.log('\nThe updated state history and set the node:');
await graph.updateState(thread2, saveState.values, 'Node1');
const stateHistory6 = await graph.getStateHistory(thread2);
i = 0;
for await (const state of stateHistory6) {
	if (i >= 3) console.log(state);
	i++;
}

console.log('\nFinally invoke the graph with this new state:');
await graph.invoke(null, thread2);
const stateHistory7 = await graph.getStateHistory(thread2);
for await (const state of stateHistory7) {
	console.log(state);
}

///////// FUNCTIONS USED BY THE GRAPH //////////
function node1(state: AgentState) {
	console.log('node1, count: ' + state.count);
	return {lnode: 'node_1', count: 1};
}

function node2(state: AgentState) {
	console.log('node2, count: ' + state.count);
	return {lnode: 'node_2', count: 1};
}

function shouldContinue(state) {
	return state.count < 3;
}
