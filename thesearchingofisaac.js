// TO DO:
// xxxx1. data merge
// xxxx2. hook up searching
// xxxxfully render results
// - hand-tune supplemental data
//		- include categorization for devil/angel items
// - add back aliases
// - sort
//		- by relevance (implement relevance scoring)
//			- score exact matches most highly, users don't need to quote anything
//	    - by name
// - maybe checkboxes for more sort options (save them if you do this)
//     - exact match, etc
//     - maybe make quotes do what you expect
// - fix broken links
// ALSO
// - add pills

var g_testData =
{
	"items":
	[
		{ "name": "9 volt", "tags": "battery cube duracell"},
		{ "name": "Abaddon", "tags": "penta star red"},
		{ "name": "Abel", "tags": "familiar face dead baby gray"},
		{ "name": "Anemic", "tags": "tear red"},
		{ "name": "Aquarius", "tags": "zodiac blue waves"},
		{ "name": "Aries", "tags": "zodiac blue ram"},
		{ "name": "Ball Of Bandages", "tags": "familiar orbital round pink"}
	],
	"aliases":
	[
		"battery charge",
		"syringe needle",
		"black dark gray grey",
		"fly flies",
		"zodiac horoscope horroscope",
		"round circle ball sphere"
	]
};

function prepareTestData(data)
{
	// process the aliases first
	var aliasLookup = {};
	data.aliases.forEach(function(aliasString, i, array)
	{
		var aliases = aliasString.split(' ');
		aliases.forEach(function(alias, i, array)
		{
			aliasLookup[alias] = aliasString;
		});
	});


	//KAI: maybe include a "class" field.  When scoring matches, the name is weighted higher than class, then higher then tags
	// add a by-name lookup
	data.itemLookup = {};

	// convert item.tags to a hash for faster lookups (KAI: is it really faster than just indexOf on .tags?)
	data.items.forEach(function(item, i, array)
	{
		item.nameLowerCase = item.name.toLowerCase();
		data.itemLookup[item.nameLowerCase] = item;

		var aliasesToAppend = "";
		var tags = item.tags.split(' ');
		tags.forEach(function(tag, i, array)
		{
			if (aliasLookup[tag])
			{
				aliasesToAppend += " " + aliasLookup[tag];
			}
		});
		item.tags += " " + aliasesToAppend;
	});
}

function retrieveTestHits(data, searchText)
{
	// split search into multiple terms
	var terms = searchText.toLowerCase().split(' ');  // KAI: should maybe regexp for whitespace instead

	// scan the items, gather the hits
	var hits = [];
	var nTerms = terms.length;
	data.items.forEach(function(item, i, array)
	{
		for (var i = 0; i < nTerms; ++i)
		{
			var term = terms[i];
			if (item.nameLowerCase.indexOf(term) >= 0 || item.tags.indexOf(term) >= 0)
			{
				hits.push(item);
				break;
			}
		}
	});

	return hits;
}

function retrieveHits(data, searchText)
{
	// split search into multiple terms
	var terms = searchText.toLowerCase().split(' ');  // KAI: should maybe regexp for whitespace instead
	var nTerms = terms.length;

	var hits = [];
	for (var key in data.items)
	{
		var item = data.items[key];
		for (var i = 0; i < nTerms; ++i)
		{
			var term = terms[i];

			// item name match
			if (key.indexOf(term) >= 0)
			{
				hits.push(item);
				break;
			}
			// color
			if (item.itemColor.indexOf(term) >= 0)
			{
				hits.push(item);
			}
			// tag hits
			if (item.itemTags.indexOf(term) >= 0)
			{
				hits.push(data.items[key]);
				break;
			}
		}
	}
	return hits;
}

var g_data = 
{
	items: {}
};
var g_classes = "collectible passive trinket card rune pill"
function prepareData(data)
{
	mergeItems(data, 
		[afterbirthTrinkets, afterbirthTrinketsSupplemental, rebirthTrinkets, rebirthTrinketsSupplemental], 
		function(item) {  item.itemClass = "trinket"; });
	mergeItems(data, 
		[afterbirthCollectibles, afterbirthCollectiblesSupplemental, rebirthCollectibles, rebirthCollectiblesSupplemental], 
		function(item) {  item.itemClass = "collectible"; });
	mergeItems(data, 
		[afterbirthPassives, afterbirthPassivesSupplemental, rebirthPassives, rebirthPassivesSupplemental], 
		function(item) {  item.itemClass = "passive"; });
	mergeItems(data, 
		[cards, cardsSupplemental, cardsOther, cardsOtherSupplemental, cardsPlaying, cardsPlayingSupplemental, cardsSpecial, cardsSpecialSupplemental], 
		function(item) { item.itemClass = "card"; });
	mergeItems(data, [runes1, runes2, runes1Supplemental, runes2Supplemental], function(item) { item.itemClass = "rune"; })
}
function mergeItems(data, itemTableArray, override)
{
	itemTableArray.forEach(function(itemTable)
	{
		for (var key in itemTable)
		{
			var source = itemTable[key];
			var keyLower = key.toLowerCase().trim();  // some whitespace snuck into names during scraping, thought I trimmed everything
			var merged = data.items[keyLower] || {};

			merged.properName = key;
			merged.wikiPage = merged.wikiPage || source.wikiPage;
			merged.thumbnail = merged.thumbnail || source.thumbnail;
			merged.descriptionHTML = merged.descriptionHTML || source.descriptionHTML;
			merged.itemClass = merged.itemClass || source.itemClass;
			merged.itemType = merged.itemType || source.itemType;
			merged.itemColor = merged.itemColor || source.itemColor;
			merged.itemTags = merged.itemTags || source.itemTags;

			if (override)
			{
				override(merged);
			}
			data.items[keyLower] = merged;
		}
	});
}
update.lastTerms = null;
function update()
{
	var terms = event.currentTarget.value.trim();
	if (update.lastTerms != terms)
	{
		if (terms.length)
		{
			//KAI: search also for the fully entered text, score it more highly
			var hits = retrieveHits(g_data, terms);
			renderHits(hits);
		}
		else
		{
			renderClear();
		}
		update.lastTerms = terms;
	}
}
function renderHits(hits)
{
	hitsContainer.innerHTML = tableTemplate.textContent;
	hits.forEach(function(hit) {

		var row = document.createElement('tr');

		// name column
		var cell = document.createElement('td');
		var nameParent = cell;
		if (hit.wikiPage)
		{
			var anchor = document.createElement('a');
			anchor.href = hit.wikiPage;
			nameParent = anchor;

			cell.appendChild(anchor);
		}
		nameParent.appendChild(document.createTextNode(hit.properName));
		row.appendChild(cell);

		// image column
		cell = document.createElement('td');
		cell.className = "itemIconCell";

		var img = document.createElement('img');
		img.src = hit.thumbnail;
		img.className = "itemIcon";

		cell.appendChild(img);
		row.appendChild(cell);

		// description
		cell = document.createElement('td');
		cell.innerHTML = hit.descriptionHTML;
		row.appendChild(cell);

		hitsTable.tBodies[0].appendChild(row);
	});
}
function renderClear()
{
	hitsContainer.innerHTML = "";
}
prepareTestData(g_testData);
prepareData(g_data);
loading.style.display = "none";