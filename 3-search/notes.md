# Agentic Search

To try this section we needed to install the Tavily JS API and ensure the API key is set in the environment.
```
npm i @tavily/core
```
## Why Search Tool
```
 --------      -------      -------
| Prompt |--->| Agent |--->| Agent |
 --------      -------      -------
                  |            ^
    Search query  |            | RAG content
                  v            |
               --------        |
              | Search |-------
              |  Tool  |
               --------
```
## Inside the search tool
```
                              --------    --------
                             | Source |  | Source |
                              --------    --------
                                    ^      ^
                                    |      |
                                    |      |
 -------      -------------        ----------        -----------        --------------
| Query |--->| Sub-queries |----->| Retrieve |----->| Scoring & |----->| Return top-k |
 -------      ------------- |      ----------       | filtering |      |   documents  |
               ------------- |      |      |         -----------        --------------
                -------------       |      |
                                    v      v
                               --------   --------
                              | Source | | Source |
                               --------   --------
                                  /\
                                 /  \
          -----------------------------------------------------------
         | Source                                                    |
         |                     Chunked source                        |
         |                     --------------                        |
         |                    | xxxxxxxxxxxx |        Top-k chunks   |
         |                     --------------        --------------  |
         |                    | xxxxxxxxxxxx |      | xxxxxxxxxxxx | |
         |  -----------        --------------        --------------  |
         | | Sub-query |----->|              |----->| xxxxxxxxxxxx | |
         |  -----------        --------------        --------------  |         
         |                    | xxxxxxxxxxxx |      | xxxxxxxxxxxx | |
         |                     --------------        --------------  |
         |                    |              |                       |
         |                     --------------                        |
         |                                                           |
          -----------------------------------------------------------
```
