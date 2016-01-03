# The Finding of Isaac

	This is a tool to help identify that item that just dropped in your Binding of Isaac Rebirth/Afterbirth run.  Just start typing something descriptive, like *"syringe", "gross blood", or "blue fly"*, etc, to narrow down the item.  Results are linked to the [gamepedia.com wiki](http://bindingofisaacrebirth.gamepedia.com/Binding_of_Isaac:_Rebirth_Wiki).

## Implementation Notes

	Written in pure javascript and HTML, no frameworks.  All game data lives in the linked JSON files, and was scraped from the wiki (see isaacWikiScrape.js for details).  The code has not been optimized at all, but is very simple and seems to run well enough on Chrome, Firefox, and IE.
