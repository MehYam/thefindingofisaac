// TO DO:
// xxxx1. data merge
// xxxx2. hook up searching
// xxxxfully render results
// xxxxscored sort
// xxxxxhand-tune supplemental data
// - hook up aliases
//		- for color and type too (i.e. dark, zodiac, syringe/needle, etc)?
// - add checkboxes for the sort options
//     - exact match, etc
//     - serialize the settings
// - add description to the sort options
// - fix broken links
// - make links open in new page
// ALSO
// - add pills
function retrieveHits_OR(data, searchText)
{
	// split search into multiple terms
	var terms = searchText.toLowerCase().split(' ');  // KAI: should maybe regexp for whitespace instead
	var nTerms = terms.length;

	var hits = [];
	for (var key in data.items)
	{
		var item = data.items[key];
		var score = 0;

		// full item name match
		if (key.indexOf(searchText) >= 0)
		{
			score += 20;
		}
		for (var i = 0; i < nTerms; ++i)
		{
			var term = terms[i];

			// item name match
			if (key.indexOf(term) >= 0)
			{
				score += 10;
			}
			// class
			if (item.itemClass.indexOf(term) >= 0)
			{
				score += 5;
			}
			// type
			if (item.itemTypeWithAliases.indexOf(term) >= 0)
			{
				score += 3;
			}
			// color
			if (item.itemColor.indexOf(term) >= 0)
			{
				score += 2;
			}
			// tag hits
			if (item.itemTagsWithAliases.indexOf(term) >= 0)
			{
				score += 1;
			}
		}
		if (score)
		{
			hits.push({ item: item, score: score });
		}
	}
	return hits;
}
var g_data = 
{
	items: {},
	aliases: {}
};
var g_classes = "collectible passive trinket card rune pill"
function prepareData(data)
{
	mergeItems(data, 
		[afterbirthTrinkets, afterbirthTrinketsSupplemental, rebirthTrinkets, rebirthTrinketsSupplemental], 
		function(item) {  item.itemClass = "trinket"; });
	mergeItems(data, 
		[afterbirthCollectibles, afterbirthCollectiblesSupplemental, rebirthCollectibles, rebirthCollectiblesSupplemental], 
		function(item) {  item.itemClass = "activated"; });
	mergeItems(data, 
		[afterbirthPassives, afterbirthPassivesSupplemental, rebirthPassives, rebirthPassivesSupplemental], 
		function(item) {  item.itemClass = "passive"; });
	mergeItems(data, 
		[cards, cardsSupplemental, cardsOther, cardsOtherSupplemental, cardsPlaying, cardsPlayingSupplemental, cardsSpecial, cardsSpecialSupplemental], 
		function(item) { item.itemClass = "card"; });
	mergeItems(data, [runes1, runes2, runes1Supplemental, runes2Supplemental], function(item) { item.itemClass = "rune"; })

	var aliasLookup = createAliasLookup(g_aliases);
	explodeItemAliases(g_data, aliasLookup);
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
function createAliasLookup(aliasList)
{
	var retval = {};

	aliasList.forEach(function(aliasSpec)
	{
		var aliasTerms = aliasSpec.split(/\s+/);
		aliasTerms.forEach(function(alias)
		{
			if (retval[alias])
			{
				console.error("Alias '" + alias + "' used multiple times, ignoring repeats");
			}
			else
			{
				retval[alias] = aliasTerms;
			}
		});
	});
	return retval;
}
Array.prototype.unique = function() {
    var a = [];
    for (var i=0, l=this.length; i<l; i++)
        if (a.indexOf(this[i]) === -1)
            a.push(this[i]);
    return a;
}
function explodeItemAliases(data, aliasLookup)
{
	// search each item for alias matches, and shove the alternate search terms into the item itself
	for (var key in data.items)
	{
		var item = data.items[key];

		item.itemTypeWithAliases = explodeAliases(aliasLookup, item.itemType);
		item.itemTagsWithAliases = explodeAliases(aliasLookup, item.itemTags);
	}	
}
function explodeAliases(aliasLookup, termsString)
{
	var termsArray = termsString.split(/\s+/);
	var newTermsArray = [].concat(termsArray);

	termsArray.forEach(function(term)
	{
		if (aliasLookup[term])
		{
			newTermsArray = newTermsArray.concat(aliasLookup[term]);
		}
	});

	newTermsArray.sort();
	newTermsArray = newTermsArray.unique();
	return newTermsArray.join(' ');
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
			var hits = retrieveHits_OR(g_data, terms);
			hits.sort(function(hitA, hitB){
				return hitB.score - hitA.score;
			});
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
		if (hit.item.wikiPage)
		{
			var anchor = document.createElement('a');
			anchor.href = hit.item.wikiPage;
			nameParent = anchor;

			cell.appendChild(anchor);
		}
		nameParent.appendChild(document.createTextNode(hit.item.properName));
		row.appendChild(cell);

		// image column
		cell = document.createElement('td');
		cell.className = "itemIconCell";

		var img = document.createElement('img');
		img.src = hit.item.thumbnail;
		img.className = "itemIcon";

		cell.appendChild(img);
		row.appendChild(cell);

		// description
		cell = document.createElement('td');
		cell.innerHTML = hit.item.descriptionHTML;
		row.appendChild(cell);

		// type
		cell = document.createElement('td');
		cell.appendChild(document.createTextNode(hit.item.itemClass));
		cell.className = "itemTypeCell";
		row.appendChild(cell);

		// score
		cell = document.createElement('td');
		cell.appendChild(document.createTextNode(hit.score));
		cell.className = "scoreCell";
		row.appendChild(cell);

		hitsTable.tBodies[0].appendChild(row);
	});
}
function renderClear()
{
	hitsContainer.innerHTML = "";
}
prepareData(g_data);
loading.style.display = "none";