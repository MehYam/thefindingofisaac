var DLC =
{
	BASE: "base",
	AFTERBIRTH: "afterbirth",
	AFTERBIRTHPLUS: "afterbirthplus",
	ANTIBIRTH: "antibirth"
}
function prepareData(data)
{
	assignDLC([rebirthTrinkets, rebirthCollectibles, rebirthPassives, cards, cardsOther, cardsPlaying, cardsSpecial], DLC.BASE);
	assignDLC([afterbirthTrinkets, afterbirthCollectibles, afterbirthPassives], DLC.AFTERBIRTH);
	assignDLC([afterbirthPlusTrinkets, afterbirthPlusCollectibles, afterbirthPlusPassives], DLC.AFTERBIRTHPLUS);
	assignDLC([antibirthTrinkets, antibirthCollectibles, antibirthPassives], DLC.ANTIBIRTH);

	mergeItems(data, 
		[afterbirthTrinkets, afterbirthTrinketsSupplemental, rebirthTrinkets, rebirthTrinketsSupplemental, antibirthTrinkets, antibirthTrinketsSupplemental, afterbirthPlusTrinkets, afterbirthPlusTrinketsSupplemental], 
		function(item) {  item.itemClass = "trinket"; });
	mergeItems(data, 
		[afterbirthCollectibles, afterbirthCollectiblesSupplemental, rebirthCollectibles, rebirthCollectiblesSupplemental, antibirthCollectibles, antibirthCollectiblesSupplemental, afterbirthPlusCollectibles, afterbirthPlusCollectiblesSupplemental], 
		function(item) {  item.itemClass = "activated"; });
	mergeItems(data, 
		[afterbirthPassives, afterbirthPassivesSupplemental, rebirthPassives, rebirthPassivesSupplemental, antibirthPassives, antibirthPassivesSupplemental, afterbirthPlusPassives, afterbirthPlusPassivesSupplemental], 
		function(item) {  item.itemClass = "passive"; });
	mergeItems(data, 
		[cards, cardsSupplemental, cardsOther, cardsOtherSupplemental, cardsPlaying, cardsPlayingSupplemental, cardsSpecial, cardsSpecialSupplemental], 
		function(item) { item.itemClass = "card"; });
	mergeItems(data, [runes1, runes2, runes1Supplemental, runes2Supplemental], function(item) { item.itemClass = "rune"; })

	fixUpRelativeURLs(data);

	console.log("Item merge steps: " + mergeItems.totalMerged);

	var aliasLookup = createAliasLookup(g_aliases);
	explodeItemAliases(g_data, aliasLookup);
}
mergeItems.totalMerged = 0;
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
			merged.dlc = merged.dlc || source.dlc;

			if (override)
			{
				override(merged);
			}
			data.items[keyLower] = merged;

			++mergeItems.totalMerged;
		}
	});
}
function assignDLC(itemTableArray, dlcName)
{
	itemTableArray.forEach(function(itemTable)
	{
		for (var key in itemTable)
		{
			var item = itemTable[key];
			item.dlc = dlcName;
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
		item.itemColorWithAliases = explodeAliases(aliasLookup, item.itemColor);
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
function fixUpRelativeURLs(data)
{
	// HACK: fix up the relative links in the description HTML until this hosted on the wiki
	for (var key in data.items)
	{
		var item = data.items[key];
		item.descriptionHTML = item.descriptionHTML.replace(/href="/g, "target=\"_blank\" href=\"http://bindingofisaacrebirth.gamepedia.com");
	}
}
function retrieveHits(data, searchText, dlcFilter, searchTermsWithAND)
{
	console.log("-> retrieveHits");

	// split search into multiple terms
	var terms = searchText.split(' ');  // KAI: should maybe regexp for whitespace instead
	var nTerms = terms.length;

	var hits = [];
	for (var key in data.items)
	{
		var item = data.items[key];
		if (!dlcFilter[item.dlc])
		{
			continue;
		}

		var score = 0;
		for (var i = 0; i < nTerms; ++i)
		{
			var term = terms[i];
			var termScore = 0;

			// item name match
			if (key.indexOf(term) >= 0)
			{
				termScore += 10;
			}
			// class
			if (item.itemClass.indexOf(term) >= 0)
			{
				termScore += 5;
			}
			// type
			if (item.itemTypeWithAliases.indexOf(term) >= 0)
			{
				termScore += 3;
			}
			// color
			if (item.itemColorWithAliases.indexOf(term) >= 0)
			{
				termScore += 2;
			}
			// tag hits
			if (item.itemTagsWithAliases.indexOf(term) >= 0)
			{
				termScore += 1;
			}
			// with AND, all terms must generate some kind of score
			if (searchTermsWithAND && !termScore)
			{
				score = 0;
				break;
			}
			score += termScore;
		}
		// full item name match
		if (key.indexOf(searchText) >= 0)
		{
			score += 20;
		}
		if (score)
		{
			hits.push({ item: item, score: score });
		}
	}
	console.log("<- retrieveHits");
	return hits;
}
function renderHits(hits)
{
	console.log("-> renderHits");
	hitsContainer.innerHTML = tableTemplate.textContent;
	hits.forEach(function(hit) {

		if (!hit.item.rowHTML)
		{
			hit.item.rowHTML = renderRow(hit);
		}
		hitsTable.tBodies[0].appendChild(hit.item.rowHTML);
	});
	console.log("<- renderHits");
}
function renderRow(hit)
{
	var row = document.createElement('tr');

	// name column
	var cell = document.createElement('td');
	var nameParent = cell;
	if (hit.item.wikiPage)
	{
		var anchor = document.createElement('a');
		anchor.href = hit.item.wikiPage;
		anchor.target = "_blank";
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

	return row;
}
function renderAll(data, dlcFilter)
{
	var hits = [];
	for (var key in data.items)
	{
		var item = data.items[key];
		if (dlcFilter[item.dlc])
		{
			hits.push({ item: data.items[key], score: 0 });
		}
	}
	renderHits(hits);
}
function renderClear()
{
	hitsContainer.innerHTML = "";
}
function update(event)
{
	var searchText = event.currentTarget.value.trim().toLowerCase();
	var lastSearchText = getOption(OPTIONS.LASTSEARCH);
	if (lastSearchText != searchText)
	{
		doSearch(searchText);
		saveOption(OPTIONS.LASTSEARCH, searchText);
	}
}
function doSearch(searchText)
{
	var dlcFilter = {};
	if (rbbutton.checked) dlcFilter[DLC.BASE] = true;
	if (abbutton.checked) dlcFilter[DLC.AFTERBIRTH] = true;
	if (abplusbutton.checked) dlcFilter[DLC.AFTERBIRTHPLUS] = true;
	if (anbbutton.checked) dlcFilter[DLC.ANTIBIRTH] = true;

	if (searchText.length)
	{
		if (searchText == "all")
		{
			renderAll(g_data, dlcFilter);
		}
		else
		{
			var hits = retrieveHits(g_data, searchText, dlcFilter, true);
			hits.sort(function(hitA, hitB){
				return hitB.score - hitA.score;
			});
			renderHits(hits);
		}
	}
	else
	{
		renderClear();
	}

	var resultTable = document.getElementById('hitsTable');
	resultsCount.textContent = resultTable ? resultTable.rows.length - 1 : 0;
}
var g_data = 
{
	items: {},
	aliases: {}
};
var OPTIONS =
{
	HEADER: "thefindingofisaac.10.",
	LASTSEARCH: "lastSearch",
	REBIRTH: "rebirth",
	AFTERBIRTH: "afterbirth",
	AFTERBIRTHPLUS: "afterbirthplus",
	ANTIBIRTH: "antibirth"
}
function getOption(optionName, defaultValue)
{
	var optionFull = OPTIONS.HEADER + optionName;
	var result = localStorage.getItem(optionFull);
	if (result == undefined)
	{
		return defaultValue;
	}
	return result === 'true' || (result === 'false' ? false : result);
}
function saveOption(optionName, value)
{
	var optionFull = OPTIONS.HEADER + optionName;
	localStorage.setItem(optionFull, value);
}
function restoreButtons()
{
	// turn on all expansion by default
	rbbutton.checked = getOption(OPTIONS.REBIRTH, true);
	abbutton.checked = getOption(OPTIONS.AFTERBIRTH, true);
	abplusbutton.checked = getOption(OPTIONS.AFTERBIRTHPLUS, true);
	anbbutton.checked = getOption(OPTIONS.ANTIBIRTH, true);
}
function onSearchOption()
{
	saveOption(OPTIONS.REBIRTH, rbbutton.checked);
	saveOption(OPTIONS.AFTERBIRTH, abbutton.checked);
	saveOption(OPTIONS.AFTERBIRTHPLUS, abplusbutton.checked);
	saveOption(OPTIONS.ANTIBIRTH, anbbutton.checked);

	doSearch(getOption(OPTIONS.LASTSEARCH));
}
function main()
{
	prepareData(g_data);
	loading.style.display = "none";	

	// restore the last searched term and options
	restoreButtons();

	var lastSearch = getOption(OPTIONS.LASTSEARCH, "blue fly");
	searchTerms.value = lastSearch; 
	searchTerms.select();

	doSearch(lastSearch);
}
