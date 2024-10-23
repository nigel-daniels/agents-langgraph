# Build an agent from scratch
In this lesson we will see this is not too hard, while doing this note what the LLM is being asked to do and what the runtime is doing.

This agent will be based on the ReAct pattern.
```
ReAct (Reason + Act)
====================
        thought          Actions
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
- The LLM thinks about what to do
- It decides an action to take
- It then executes the action in an environment
- This results in an observation
- The observation then informs the next thought
- This iteration continues until the LLM thinks it is done 
