// Current workflow:
//
// 1) open the isaac rebirth wiki page to scrape
// 2) paste this file directly in the dev console
// 3) run scrapeTable() and scrapeTableSublementalTemplate, save them directly to files
// 3.5) there may be more than one table of items to scrape per page, so pass in different table indices as appropriate
// 4) save the files where the combiner script can find them

var g_descriptionCol = 2; // changes for cards and runes
function scrapeTable(tableIndex)
{
	return JSON.stringify(extractToJSON(getTable(tableIndex), rowImageAndThumbnailScrape), null, '\t');
}
function scrapeTableTemplate(tableIndex)
{
	return JSON.stringify(extractToJSON(getTable(tableIndex), rowMetadataTemplateScrape), null, '\t');
}
function extractToJSON(table, rowScraper)
{
	var retval = {};

	var nRows = table.rows.length;
	for (var r = 1; r < nRows; ++r)
	{
		var row = table.rows[r];
		var nCols = row.cells.length;

		var name = row.cells[0].textContent.trim();
		retval[name] = rowScraper(row);
	}
	return retval;
}
function rowImageAndThumbnailScrape(row)
{
	var entry = {};

	var anchor = getChildTag(row.cells[0], "a");
	if (anchor)
	{
		entry.wikiPage = anchor.href;
	}

	// var img = getChildTag(row, "img", 1) || getChildTag(row, "img"); // cards/runes have the "DLC" icon before the item icon
	var img = getChildTag(row, "img");
	entry.thumbnail = img.src;

	var description = row.cells[g_descriptionCol];
	entry.descriptionHTML = description.innerHTML.trim();
	return entry;
}
function rowMetadataTemplateScrape(row)
{
	var entry = {};
	entry.itemType = "";
	entry.itemColor = "";
	entry.itemTags = "";
	return entry;
}
function getTable(index)
{
	return document.body.getElementsByTagName("table")[index];
}
function getChildTag(el, tagName, index)
{
	index = index || 0;

	var elements = el.getElementsByTagName(tagName);
	return elements && (elements.length > index) && elements[index];
}