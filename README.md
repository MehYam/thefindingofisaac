# The Finding of Isaac

This is a tool to help identify that item that just dropped in your Binding of Isaac run.  Just start typing something descriptive, like *"syringe", "gross blood", or "blue fly"*, etc, to look it up.  Results are linked to the [gamepedia.com wiki](http://bindingofisaacrebirth.gamepedia.com/Binding_of_Isaac:_Rebirth_Wiki).

## Implementation Notes

Written in pure frontend HTML, CSS, and Javascript without dependencies or frameworks.  All game data lives in the linked JSON files.  Currently, the wiki items and images are scraped with some manually run dev console utilities, see scraper.js for details.  The code has not been optimized at all, but is very simple and seems to run well enough on any browser.

### TO DO:
- automate the scraping tools better
- update data for 2026
	- fresh scrape
	- use ColorWeave to generate color tags
	- more tags, starting items for player characters, etc
- more functionality/data
	- transformations
	- item pools
	- characters
	- bosses
	- item specific info?
		- Pandora's Box rewards
		- Spindown dice lookup
		- Book of Virtues, Lemegeton
- performance
	- table renders slowly (virtualize? "show all" button?)
	- return focus to text box after clicking link
- maybe improve text matches (i.e. "red" shouldn't match "credit" ?)
- add description to the sort options
