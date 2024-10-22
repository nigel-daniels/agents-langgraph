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
### Node and JS
Before trying any of the exercises don't forget to run `npm install` in the `./function_tools_agents` directory to install the Node modules needed.

In each subdirectory you will find a `*.js` file and, sometimes, some supporting files. Each JS file contains multiple prompts.

In most cases the initial exercise is ready to run and the other exercises are commented out using the `\* ... *\` comment markers. In these cases the commented code blocks will have their own calls to the LLM. If you uncomment these blocks then be sure to comment out the last to calls above while you run that exercise, it will reduce run time and costs.
