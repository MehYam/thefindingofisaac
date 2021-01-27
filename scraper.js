// Workflow:
//
// - open the isaac wiki page to scrape (i.e. http://bindingofisaacrebirth.gamepedia.com/Trinkets)
// - paste this file into the dev console
// - type 'listTables()' to help locate the table to scrape
// - 'scrapeTable(n, item-type)' will create the array of new/updated items
// - 'copy(JSON.stringify(scrapeTable(n, item-type)))' to clipboard copy the items
// - open scraper.html in browser, follow directions
// - paste the new items into items.js
// - sanity check changes
// - (optional, but highly recommended): follow steps in base64ImagePacker.js to generate new spritesheet

// Current targets:
// https://bindingofisaacrebirth.gamepedia.com/Items - 2 tables
// https://bindingofisaacrebirth.gamepedia.com/Trinkets - 1 table
// https://bindingofisaacrebirth.gamepedia.com/Cards_and_Runes - 12 tables

function scrapeTable(tableIndex, itemType)
{
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
