## A calmer internet, one article at a time. 

A resurrection of Google Reader that brings back intentional news consumption through a nostalgic, terminal-inspired interface. Subscribe to your favorite sources, discover stories through a transparent recommendation engine, and recliam your attention from endless scrolling. 

## The experience to build 

- the experience will be a web app that looks like a green computer terminal
- user will be using keyboard to navigate UI (arrow keys, space bar, ESC button) 
- users do not need to create an account, they are instantly able to enter and start reading

## Core page flows 
Here are the core page flows used to spec out the app:
1. Curated (TAB)
    - there will be a list of content that the user can view 
    - a piece of content will display the title, the label/category, and the estimated read time 
    - the curation is ordered by how interested the user might be in the content
    - curated can include content outside of subscriptions but there is a badge to the right of the content to distinguish it 
    - every recommended content should have a reason attached 
    - there is a distinct refresh button that allows users to refresh their curated feed
2. Feed (TAB) 
    - the news feed that will display content from all of the user's subscribed feed sources
    - there is no recommendation or re-ordering. this is a raw feed of all the user's subscriptions
    - there should be real-time updates - new content that comes out will auto-populate without refresh and push listed content down 
    - there should be a top bar with multi-select that allows the user to filter by feed source. pressing 'SPACE' selects/unselects a feed source 
    - navigating through the feed, the user can press 'SPACE' on a piece of content to open a tab displaying the content
3. Subscriptions (TAB)
    - there is a checkbox list of existing subscriptions that allows the user to unsubscribe. Pressing 'SPACE' will select the source.
    - there are actions to view details about a source or unsubscribe from the source
    - there is a top search bar that allows the user to search for news sources
    - when a query fires, already selected news sources will be listed first followed by not subscribed sources 
4. Content Page 
    - the content page is navigated when the user selects a piece of content from their feed or the curated tab
    - the user can press 'ESC' to return to the previous page 
    - the user can scroll through the content by using the arrow keys 
    - at the bottom of the content, the user can press down arrow to navigate to the next piece of content 
    - the user can also press a shortcut button to skip to the next content without scrolling to the bottom
    - the user's behavior will be tracked to gauge their interest and engagement with an existing piece of content - this information will be used to calibrate the curated algorithm
5. Curated Algorithm 
    - there is an internal algorithm that will continuously reorder the exisiting content collected from the feeds and provide the user with the best content candidates
    - the algorithm is learning from the user based on explicit interests and reading behavior 
    - there is vector data structure that we build based on content similarity 
    - telemetry is collected about the user's behavior and engagement with specific content - this is used to gauge the user's approximate interest in the vector shape
    - do not rely exclusively on passive telemetry - add simple keyboard shortcuts: B - bookmark article, L - more like this, X - less like this, O - open original source 
    - make suggestions configurable - ex. 80% personalized content 20% exploratory content 