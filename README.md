# AI Agents in LangGraph
This is based on the DeepLearning.AI, [AI Agents in LangGraph](https://learn.deeplearning.ai/courses/ai-agents-in-langgraph/) course. In this repository I have converted all of the examples from Python to JavaScript.
## Introduction
Agentic use and agentic search have moved on a lot recently. The sort of workflow discussed is one in which a request is made, actions to find information are taken and the results are written up. This is an iterative process until the goal is reached. This involves:
- Planning
- Tool use
- Reflection
- Multi-agent communication
- Memory
Langchain offers many of these elements, but has recently improved agent support with Cyclic Graphs.
### Cyclic Graphs
```
ReAct (Reason + Act)
====================
                         Actions
     -------------    -------------
    |             |  |             |
    |             v  |             v
Reasoning         LLM             Env    
 Traces
    ^             |  ^             |
    |             |  |             |
     -------------    -------------
                       Observations
```
[ReAct: Synergizing reasoning and acting in language models](https://arxiv.org/abs/2210.03629)
```
Self-Refine
===========

                 Input
    -------------  |  -------------
   |             | | |             |
   v             | v |             v
Feedback        Model M          Refine
   |             ^   ^             |
   |             |   |             |
    -------------     -------------
    Use M to get     Use M to refine
  feedback on its  its previous output
     own output     given the feedback
```
[Self-Refine: Iterative refinement with self-feedback](https://arxiv.org/abs/2303.17651)
```
AlphaCodium
===========
                    PRE-PROCESSING                                          CODE ITERATIONS
 -------------------------------------------------------       --------------------------------------    
                                                                      _____________
                                                                      |           |
                                                                      v           |
Input - Problem          Generate              Rank               Iterate on      |      Iterate on
 Description +           Possible ---------> Solutions           Public Tests --------->  AI Tests  <-
 Public Tests            Solutions               |                    ^                       |       |
      |                      ^                   |                    |                       |       |
      |                      |                   |                    |_____                  |-------
      v                      |                   v                    |     |                 v
   Problem              Public Tests          Generate             Initial  |               Final
  Reflection --------->  Reasoning           Additional --------->  Code  <-               Solution
                                              AI Tests            Solution
```
[Code engineering with AlphaCodium: From prompt engineering to flow engineering](https://arxiv.org/pdf/2401.08500)
Langchain has been extended to include `LangGraph` to support these.
### Lessons
- [Build an Agent from Scratch](./1-agent/notes.md)
- [LangGraph Components](./2-langgraph/notes.md)
- [Agentic Search Tools](./3-search/notes.md)
- [Persistence and Streaming](./4-persistance-streaming/notes.md)
- [Human in the loop](./5-human/notes.md)
- [Essay Writer](./6-writer/notes.md)
- [LangChain Resources](./7-resources/notes.md)
## Set-Up
### API Key
If you want to try these out you will first need to setup your own ChatGPT secret key in your local environment. [Here](https://chatgpt.en.obiscr.com/blog/posts/2023/How-to-get-api-key/) is how you get a key. Once you have this put it in a local (server side) environment variable. For example in Mac OS, assuming you are using `zsh`, append the following to the file `.zshenv` in you own home directory:
```
export OPENAI_API_KEY='your_secret_key_value'
```
When you restart the shell or your machine the environment variable `OPENAI_API_KEY` will be in place.
### Tavily API Key
This tutorial also uses the [Tavily](https://docs.tavily.com) search tool. To use this you need to sign up for an API key and also export that API key in the same way we exported the OpenAPI key for ChatGPT. In this case you need to add the line:
```
export TAVILY_API_KEY='your_tavily_api_key'
```
Add this into your environment settings for the shell you are using.
### Node and JS
Before trying any of the exercises don't forget to run `npm install` in the `./agents-langraph` directory to install the Node modules needed.

In each subdirectory you will find a `*.js` or a `*.ts` file and, sometimes, some supporting files. Each file contains multiple prompts.

In most cases the initial exercise is ready to run and the other exercises are commented out using the `\* ... *\` comment markers. In these cases the commented code blocks will have their own calls to the LLM. If you uncomment these blocks then be sure to comment out the last to calls above while you run that exercise, it will reduce run time and costs.

## Conclusion
There are some architectures it is worth knpwing about but which are not covered by this course. These include:
### Multi-Agent
Multiple agents working on the same state. All work on the same shared state.
```
 -----------------------------------
|                User               |
| Input: Generate a chart of ave.   |
| temp. in Alaska over last decade. |
 -----------------------------------
              |
   First go to researcher
              |
              v
 --------------------------                            -----------------------                            -----------------
|        Researcher        |--------- message ------->|        Router         |<-------- message --------| Chart Generator |
| Call a 'search' function |                          | (If statements based) |                          |                 |
|       or FINISH          |<--- If 'continue' and ---|    on agent output)   |--- If 'continue' and --->|  Code execution |
 --------------------------       state.sender ==      -----------------------       state.sender ==      -----------------
              ^                  'chart_generator'               |                    'researcher'               ^
              |                                                  |                                               |
      If state.sender ==                                If function is called                             If state.sender ==
        'researcher'                                             |                                         'chart_generator'
              |                                                  v                                               |
              |                                             -----------                                          |
               --------------------------------------------| call_tool |-----------------------------------------
                                                            -----------
```
### Supervisor
In this case the state may not be shared, each Agent may be a separate graph. The supervisor can use a more powerful LLM.
```
                -------
               | User  |
                -------
                 |   ^
                 |   |
                 v   |
  -----------------------------------
 |            Supervisor             |
  -----------------------------------
   ^   |         |   ^         ^   |
   | route     route |         | route
   |   |         |   |         |   |       
   |   v         v   |         |   v
 ---------     ---------     ---------
| Agent 1 |   | Agent 2 |   | Agent 3 |
 ---------     ---------     ---------
```
### Flow Engineering (Plan and Execute)
See the [Codium model above](###Cyclic-Graphs), this is essentially a pipeline with some noted that loop. The plan and execute style flow is a simpler example of this:

```
               ------
   ---------->| Plan |
   |           ------
   |              |
   |      2 generate tasks  
1 user            v
 request     -----------                                     -----------------
   |        | Task list |                                    |               |
 ------     | * ~~~~~~~ |                    -------------------             v
| User |    | * ~~~~~~~ |-- 3 exec tasks -->| Single-task-agent |  Loop to solve task <--> TOOL
 ------     | * ~~~~~~~ |                    -------------------             |
   ^        | * ~~~~~~~ |                             |      ^               |
   |	     -----------                              |      -----------------
   |              ^                            4 update state
   |     5b replan more tasks                 with task results
5a respond        |                                   |
  to user     --------                                |
   ----------| Replan |<-------------------------------
              --------
```
### Language Agent Tree Search
This approach repeats until solved:
1. Select Node
2. Generate new candidates
2. Act, reflect and score
3. Back propagate (update parents)
This makes great use of persistence to jump back to previous times when needed.
```
 ----------     ---------     ----------     ---------     ----------     ---------
| Generate |   | Reflect |   | Generate |   | Reflect |   | Generate |   | Reflect |
 ----------    ^---------    ^----------    ^---------    ^----------    ^---------
     |        /     |       /     |        /  |     |    /              / |   |  |
     v       /      v      /      v       /   |     |   /              /  |   v  |  
 ---------- /   --------- /   ---------- /   -|-----|- /   ---------- /   |------|-
|   %Act   |   | %Act .3 |   | %Act .3  |   | %Act .6 |   | %Act .6  |   ||%Act .7 |   
 ----------     ---------     ----------     -|-----|-     ----------     |------|-
                               |      |       | ^ ^ |       |             |  ^   |
                               v      v       v/   \v       v             | /    |
                              ---    ---    -----  -----  -----  -----  --|--  --|--
                             | % |  | % |  | %.8 || %.4 || %.8 || %.4 || %.9 || %.4 |
                              ---    ---    -----  -----  -----  -----  --|--  --|--
                                                          |   |           | ^^   |
                                                          v   v           v | \  v
                                                         ---  ---       -----  -----
                                                        | % || % |     | %.2 || % 1 |
                                                         ---  ---       -----  -----
```
