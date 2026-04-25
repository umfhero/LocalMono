Sidebar collapses to 52px, expands to ~176px on hover with labels sliding in. (works fine)

Accent is now red (button, active nav bar, edit-mode toggle, "projects" entities in Briefing). (this looks amazing too)

Trend graph starts at a faint (0,0) origin dot, segments between pending tasks render grey-dashed, and the Today/1W/1M/ALL buttons now actually filter the data (Today will likely show "No tasks due today yet" with current mock timings — expected). So few issues on this one, the predictive grapgh is just flat adding to the right, it should be preditive as if i completed tasks from that point onwards. There is the text "score" that just radnomly sits under the number 24. I also want to be able to hover over each node to see what event/task it was and future ones too, so i can see what iv missed/completed etc.

Active projects progress bars need a bit of padding on sides as its overlapping the text "activiety". but look nice, could remove the container they are in and add a "new project" button to the main container tho. 

On the linear calendar view, the min height should be just below the bottom event, since the max i can reduce it by still leaves a massive area below. Hovering over events same thing for tasks, want to be able to see full details, that i can also edit to change times/day starts/ends.

Also a toggle to not only see Next 14 days, but also (week), month, year, and all options. 


Default dashboard layout packs all six widgets into a 1200×800 window with no scroll: Briefing+Today top row, Calendar middle, Trend+Projects+Files bottom. This bit is fine, but by default on full screen, the resize, edges of the conatiners are slightly out of bounds on the screen. Can you by default make them all super compact. 

So briefing top right, "today container" next to linear clander container. Recent files on the right under the briefings. Task trends height small but extend the width of the page. And active projects in the same conatiner under recent files but still its own section down the right side of the app. 


Notes:

As for quck capture, the shortcut does not work with app minimised, the "esc" or even ctrl+enter does not work to close/save. Also dont need a quick capture button on the app, its shortcut only.

