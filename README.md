# The Finding of Isaac

This is a tool to help identify that item that just dropped in your Binding of Isaac run.  Just start typing something descriptive, like *"syringe", "gross blood", or "blue fly"*, etc, to narrow down the item.  Results are linked to the [gamepedia.com wiki](http://bindingofisaacrebirth.gamepedia.com/Binding_of_Isaac:_Rebirth_Wiki).

Currently, the wiki items are scraped in a semi-manual process, see isaacWikiScrape.js for details.

## Implementation Notes

Written in pure javascript and HTML, no frameworks.  All game data lives in the linked JSON files, and was scraped from the wiki (see isaacWikiScrape.js for details).  The code has not been optimized at all, but is very simple and seems to run well enough on Chrome, Firefox, and IE.

### TODO

TO DO:
- ~~Antibirth items~~
	- ~~scrape the wiki~~
	- ~~tag the items~~
	- introduces duplicate items (i.e. D12)
	- fix fixUpRelativeUrls to point to the correct wiki
- ~~checkboxes to filter by DLC~~
- refresh Antibirth items
- BUG: filters don't work the first time a page is ever opened (i.e. set the options to a new seed)
- Afterbirth+ items
- caching causes display of incorrect score
- move *.json files to a subdir
- score items better when terms match exactly

- still slow in FF on the production site?
- return focus to text box after clicking link
- add search options options
    - AND vs. OR
    - exact match, etc
    - serialize the settings
- score sub-word matching differently from whole word (i.e. "red" shouldn't match "credit" ?)
	- or have a check-box
- add description to the sort options

- ~~performance tuning - cache tr's~~
- ~~test and tweak tagging, (i.e. The Mind and other symbols inconsistent, add more descriptors and colors)~~
- ~~test on mobile~~
- ~~type "all" to see the entire item list~~
- ~~serialize the last entry and load it upon page start~~
	- ~~put a default sample search~~
	- ~~highlight the entire text in the input box so it deletes by typing~~
- ~~alias the colors~~
- ~~RELEASE BETA~~
- ~~fix broken images~~
- ~~fix rune data (scraping broken?)~~
- ~~1. data merge~~
- ~~2. hook up searching~~
- ~~fully render results~~
- ~~scored sort~~
- ~~hand-tune supplemental data~~
- ~~hook up aliases~~
- ~~test in FF and IE~~
- ~~add help text below the search~~
- ~~publish this somewhere~~
- ~~search with AND~~
- ~~make anchors open in new page~~
- ~~fix relative links in description~~

ALSO
- add pills?