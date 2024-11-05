# Langraph Components
In this lesson we are going to look at how what we did in the last session can be replicated in `LangGraph` components. Let's remind ourselves of what we did previously in code.

## Break Down
```
                                              SYSTEM: You run in a loop of Thought,
             -------------------------                Action, PAUSE, Observation
  User      | What is the ... Poodle? |       ...
             -------------------------        Your available actions are...
                         |
			             v                    calculate: e.g. 4*7/3
             -------------------------		  ...
Prompt      |  System: You are a ...  |       Example session:
             -------------------------        User: ...weight of collie...
            | What is the ... Poodle? |
             -------------------------
			|         Obs: 37         |<----
			 -------------------------     |
                         |                 |
                         |                 |
                         v                 |
              ------------------------     |
   LLM       |          LLM           |    |  Thought: To find the combined weights
			  ------------------------     |           of a collie and a poodle I
                         |                 |           first need the average weight
                         v                 |           of a collie.
              -------------------------    |
             |   Action: call a tool   |   |  Action: averageDogWeight Toy Poodle\n
			  -------------------------    |		  PAUSE
                         |                 |
                         v                 |
                        / \                |
                       <   >               |
						\ /                |
					   / V \               |
                      /     \              |
                     /       \             |
                 return   --------         |
  Tool                   | Action |        |
                          --------         |
                              |            |
                              v            |
                          --------         |
Observation              |   37   |________|   
                          --------
```
This was encoded in our `query` function:
```javascript
async function query(question, maxTurns = 5) {
	const actionRegEx = /^Action: (\w+): (.*)$/ // This will find the action string
	const bot = new Agent(prompt);

	let i = 0;
	let nextPrompt = question;

	while (i < maxTurns) {
		i += 1;

		const result = await bot.call(nextPrompt);

		const actions = result
        	.split('\n')
			.map(a => a.match(actionRegEx))
        	.filter(a => a !== null);

		if (actions.length > 0) {
			let [_, action, actionInput] = actions[0];

			if (!(action in knownActions)) {
				throw new Error(`Unknown action: ${action}: ${actionInput}`);
			}

			console.log(` -- running ${action} ${actionInput}`);
			let observation = knownActions[action](actionInput);
			console.log('Observation:', observation);

			nextPrompt = `Observation: ${observation}`;
		} else {
			return;
		}
	}
}
```
And in the tools we provided:
```javascript
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
```
But what does all of this look like in terms of `LangChain` components?
## LangChain components
### LangChain: Prompts
Prompt templates allow for reusable prompts:
```javascript
import { ChatPromptTemplate } from '@langchain/core/prompts';

const promptTemplate = ChatPromptTemplate.fromTemplate(
	'Tell me a {adjective} joke about {content}.'
);
```
There are also prompts for agents in the hub:
```javascript
import { pull } from 'langchain/hub';

const prompt = await pull('hwchase17/react');
// https://smith.langchain.com/hub/hwchase17/react
```
### LangChain: Tools
There are various tools we can use directly from LangChain, for example the Tavily tool which we will use later:
```javascript
// get a tool from the library
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';

const tool = new TavilySearchResults({
	maxResults: 2
});

tools = [..., tool];
const functions = tools.map(convertToOpenAIFunction);
model = model.bind({functions: functions});
```
## New in LangGraph
In the example we did in the previous lesson the majority of the code written was in the loop itself. LangGraph lets us describe and control that flow, especially loops, it brings:
- Cyclic graphs
- Persistance
- Human-in-the-loop
### Graphs
If you look at all of the approaches described in the [introduction](../README.md) they are all graphs so LangGraph allows for the creation of these.
-  LangGraph extends LangChain to support graphs.
- Single and Multi-agent flows can be described and represented as graphs.
- Allows for extremely controlled flows.
- Built in-persistence allows for human-in-the-loop workflows.
Some of the key features that LangGraph supports are familiar from any directed graph modelling, it allows for:
```
 ---    ---
|   |  |   |      Nodes: Agents or functions
 ---    ---

 --------->       Edges: connecting Nodes

      / \--->
----><   >        Conditional edges: decisions
      \ /--->
       V
```
So to create our previous code in LangGraph we simply need the following set up:

```
                     |             Entrypoint: starting node
                     v
                    ---
Agent node         |   |<-------
                    ---         |		  
		             |          |
		             v          |  Edge
		            / \         |
Conditional edge   <   >        |
		            \ /         |
                   / V \ action |
                  /     \       |
	             ---   ---      |
End node        | X | |   |-----   Function node
                 ---   ---
```
### Data / State
```
   -----------------------------------------
  |         Agent State                     |
  |  -------------------------	            |
  | |  System: You are a ...  |    Previous |
  |  -------------------------      graph   |
  | | What is the ... Poodle? |     goes    |
  |  -------------------------      here    |
  | |         Obs: 37         |             |
  |  -------------------------              |
   -----------------------------------------
```
- Agent state is accessible to all parts of the graph
- It is local to the graph
- Can be stored in a persistence layer
A simple of example of this is:
```typescript
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
	  reducer: (x, y) => x.concat(y),
	  default: () => []
  })
})
```
This means our `AgentState` contains a variable `messages` which is an array of `BaseMessages`. The `reducer` means when we get a new message we  add the message to the array.

A more complex example is:
```typescript
const AgentState = Annotation.Root({
  input: : Annotation<string>,
  chatHistory: Annotation<BaseMessage[]>,
  agentOutcome: Annotation<[{<AgentAction>,<AgentFinish>,<None>}]>,
  internediateSteps: Annotation<[{<AgentAction>,<string>}]>({
    reducer: (x, y) => x.concat(y),
	default: () => []
  }),
})
```
In the complex example the first three variables will be overwritten by any updates where as the last variable adds steps as we go.
## TypeScript Code
**Note:** as this is now using typing of variable we need to use `TypeScript` with LangGraph not just `JavaScript`. In order to run our code we can no longer use `node` directly on the command line but we need to use the `tsx` module. We also use the `*.ts` extension on our files to indicate they contain `TypeScript` not `JavaScript`. For example, to run a simple file called test we would need to use the command:
```
npx tsx test.ts
```

**Dependancies:** As this uses the `tsx` we also need to install that as well as the dependancies for `@langchain.community` and `@langchain.langgraph`. These are already in the `package.json` file. Also, to use the Tavily API you need to register an account with Tavily, [here](https://tavily.com/), to obtain an API key. Once you have this key export it to your local environment as: `TAVILY_API_KEY`.
