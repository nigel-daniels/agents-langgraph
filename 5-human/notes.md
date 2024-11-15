# Human in the Loop
There are many instances were you want to provide human oversight of the agents work. This lesson builds on what we looked at in Lesson 4.

## State memory
As a graph is executed a snapshot of the state is stored in the memory:
```
     |
     v
    ---
   |0,3|<-------
    ---         |	      Memory
     |          |        ---------
     v          |       | State 3 |
    / \         |        ---------
   < 1 >        |       | State 2 |
    \ /         |        ---------
   / V \        |       | State 1 |
  /     \       |        ---------
 ---   ---      |       | State 0 |
|   | | 2 |-----         ---------
 ---   ---                   |
                             V
StateSnapshot: { AgentState, useful_things}
                                   |
                                   V
                         {..., thread, thread_ts, ...}
                                  |           |
                                  V           |
config = {configurable: {thread_id: '1',      V
                         thread_ts: '1ef17b36-ed06-6185-8001-15cf75dea535'}};
```
The thread and the thread_ts (the threads UID) can be used to access the states:
```
config = {configurable: {thread_id: '1'}};              ---------    
                            |                          | State 3 |
                            V                           ---------
            graph.getState({..., thread, ...}); Returns 'current state'
```
We can also get an iterator over all of the previous states:
```
                                                     ---------
    graph.getStateHistory({..., thread, ...});      | State 3 |
                                                     --------- |
                                                      --------- |
	Returns an iterator over        	               --------- |
		all StateSnapshots				                 ---------
```
Using the iterator allows us to get individual snapshots with their UIDs `thread_ts` we can then use this to replay from a previous point:
```
    graph.invoke(null, {..., thread, thread_ts, ...});       ---------
    graph.stream(null, {..., thread, thread_ts, ...});      | State n |
                                                             ---------
                                                     Run with state n as the
                                                   starting point, Time Travel
```
If we do the above with out the `thread_ts` identifier we will use the current state as the starting point:
```
    graph.invoke(null, {..., thread, ...});       ---------
    graph.stream(null, {..., thread, ...});      | State 3 |
    											  ---------
	                                        Uses the current state
		                                     as the starting point
```
We can also use the `thread_ts` to access a previous state, we can then modify it and add the modified state back on the memory stack making it the current state:
```
                                                         ---------
    graph.getState({..., thread, thread_ts, ...});      | State 1 |
                                                         ---------
                                                             |
                                                             V
                                                         ---------
                    modify it                           | State m |
                                                         ---------
                                                             |
                                                             V
                                                         ---------
	graph.updateState(thread, state_m.values);          | State 4 |
                                                         ---------
    graph.invoke(null, {..., thread, ...});   Runs state 4 as the current state.
```
