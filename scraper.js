// Workflow:
//
// - open the isaac wiki page to scrape (i.e. http://bindingofisaacrebirth.gamepedia.com/Trinkets)
// - paste this file into the dev console
// - type 'listTables()' to help locate the table to scrape
// - 'copyTable(tableIndex, item-type)' to scrape the items to the clipboard
// 		- item-type is "active", "trinket", "card", "passive", "soul", etc
//		- tableIndex can be an array of indexes, which helps pulling in multiple card tables
// - open scraper.html in browser, follow directions
// - paste the new items into items.js
// - sanity check changes
// 		- search for "DLC_FIXME" in case dlc type needs to be set manually
// - (optional, but highly recommended): follow steps in base64ImagePacker.js to generate new spritesheet
// - temporarily open the page in admin mode (g_data.admin = true) to in-place edit the item tags
// 		- must manually save the tags to items.js afterwards, do copy/stringify on g_items when done and paste in items.js

// Current targets:
// https://bindingofisaacrebirth.fandom.com/wiki/Items - 2 tables
// https://bindingofisaacrebirth.fandom.com/wiki/Trinkets - 1 table
// https://bindingofisaacrebirth.fandom.com/wiki/Cards_and_Runes - 15 tables

function copyTable(tableIndex, itemType) {
	copy(JSON.stringify(scrapeTable(tableIndex, itemType)));
}
function scrapeTable(tableIndex, itemType) {
	let retval = [];
	if (!Array.isArray(tableIndex)) {
		tableIndex = [ tableIndex ];
	}
	for (t of tableIndex) {
		retval = retval.concat(scrapeOneTable(t));
	}
	return retval;
}
function scrapeOneTable(tableIndex, itemType) {
    const opts = { 
        itemType,
        rowTransform: rowToItem
    };

    // derive which columns hold what data
    const table = getTable(tableIndex);
    var iCol = 0;
    for (const cell of [...table.tHead.rows[0].cells]) {
        const colHeader = cell.textContent.trim().toLowerCase();
        switch (colHeader) {
            case 'name':
            case 'rune':
                opts.nameCol = iCol;
                break;
            case 'icon':
                opts.iconCol = iCol;
                break;
            case 'effect':
            case 'collapseeffect':
            case 'description':
			case 'collapsedescription':
			case 'collapsedesciption':
                opts.descCol = iCol;
                break;
        }
        ++iCol;
    }
    console.log(opts);
    if (opts.nameCol === undefined || opts.iconCol === undefined || opts.descCol === undefined) {
        throw new Error('could not derive the columns based on the table header');
    }
    // run the scrape
	return scrapeRows(getTable(tableIndex), opts);
}
function scrapeRows(table, opts)
{
	const retval = [];
	const nRows = table.rows.length;
	for (var r = 1; r < nRows; ++r)
	{
		const item = opts.rowTransform(table.rows[r], opts);
		retval.push(item);
	}
	return retval;
}
function rowToItem(row, opts)
{
	const name = row.cells[opts.nameCol].textContent.trim();
	const id = name.toLowerCase().trim();

	const item = {
		id,
		name,
		type: opts.itemType
	};

	const anchor = getChildTag(row.cells[opts.nameCol], "a");
	item.wiki = anchor ? anchor.href : window.location.href;

	// cards/runes have the "DLC" icon before the item icon.
	var iconCol = row.cells[opts.iconCol];
    var img = getChildTag(iconCol, "img");
    
    // remove cruft from icon url
	item.thumb = img.src.split('/revision')[0];

	var description = row.cells[opts.descCol];
	item.desc = fixUpRelativeURLs(description.innerHTML.trim());
	return item;
}
function getTable(index)
{
	return document.body.getElementsByTagName("table")[index];
}
function listTables()
{
	const tables = document.body.getElementsByTagName("table");
	var i = 0;
	for (table of tables) {
		if (table.rows.length > 1) {
			const headers = table.tHead ? 
				[...table.tHead.rows[0].cells].map(cell => cell.textContent.trim()).join(',') :
				['--'];

			const firstCell = table.rows[1].cells[0].textContent;
			console.log(`table ${i}, headers: [${headers}], first item: ${firstCell}`);
		}
		else {
			console.log(`table ${i} empty`);
		}
		++i;
	}
}
function getChildTag(el, tagName, index)
{
	index = index || 0;

	var elements = el.getElementsByTagName(tagName);
	return elements && (elements.length > index) && elements[index];
}
function fixUpRelativeURLs(html)
{
	return html.replace(/href="/g, `target="_blank" href="${window.location.origin}`);
}
