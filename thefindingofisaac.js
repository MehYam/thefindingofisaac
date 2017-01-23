var g_data = 
{
	items: {},
	aliases: {},
	showScore: false
};
var DLC =
{
	BASE: "base",
	AFTERBIRTH: "afterbirth",
	AFTERBIRTHPLUS: "afterbirthplus",
	ANTIBIRTH: "antibirth"
}
function prepareData(data)
{
	var DLC_PROP = "dlc";
	addProperty([rebirthTrinkets, rebirthCollectibles, rebirthPassives, cards, cardsOther, cardsPlaying, cardsSpecial, runes1, runes2], DLC_PROP, DLC.BASE);
	addProperty([afterbirthTrinkets, afterbirthCollectibles, afterbirthPassives], DLC_PROP, DLC.AFTERBIRTH);
	addProperty([afterbirthPlusTrinkets, afterbirthPlusCollectibles, afterbirthPlusPassives], DLC_PROP, DLC.AFTERBIRTHPLUS);
	addProperty([antibirthTrinkets, antibirthCollectibles, antibirthPassives], DLC_PROP, DLC.ANTIBIRTH);

	var CLASS_PROP = "itemClass";
	addProperty([afterbirthTrinkets, rebirthTrinkets, antibirthTrinkets, afterbirthPlusTrinkets], CLASS_PROP, "trinket");
	addProperty([afterbirthCollectibles, rebirthCollectibles, antibirthCollectibles, afterbirthPlusCollectibles], CLASS_PROP, "activated");
	addProperty([afterbirthPassives, rebirthPassives, antibirthPassives, afterbirthPlusPassives], CLASS_PROP, "passive");
	addProperty([cards, cardsOther, cardsPlaying, cardsSpecial], CLASS_PROP, "card");
	addProperty([runes1, runes2], CLASS_PROP, "rune");

	mergeMetadata(data, afterbirthTrinkets, afterbirthTrinketsTags);
	mergeMetadata(data, rebirthTrinkets, rebirthTrinketsTags);
	mergeMetadata(data, antibirthTrinkets, antibirthTrinketsTags);
	mergeMetadata(data, afterbirthPlusTrinkets, afterbirthPlusTrinketsTags);
	mergeMetadata(data, afterbirthCollectibles, afterbirthCollectiblesTags);
	mergeMetadata(data, rebirthCollectibles, rebirthCollectiblesTags);
	mergeMetadata(data, antibirthCollectibles, antibirthCollectiblesTags);
	mergeMetadata(data, afterbirthPlusCollectibles, afterbirthPlusCollectiblesTags);
	mergeMetadata(data, afterbirthPassives, afterbirthPassivesTags);
	mergeMetadata(data, rebirthPassives, rebirthPassivesTags);
	mergeMetadata(data, antibirthPassives, antibirthPassivesTags);
	mergeMetadata(data, afterbirthPlusPassives, afterbirthPlusPassivesTags);
	mergeMetadata(data, cards, cardsTags);
	mergeMetadata(data, cardsOther, cardsOtherTags);
	mergeMetadata(data, cardsPlaying, cardsPlayingTags);
	mergeMetadata(data, cardsSpecial, cardsSpecialTags);
	mergeMetadata(data, runes1, runes1Tags);
	mergeMetadata(data, runes2, runes2Tags);

	fixUpRelativeURLs(data);

	console.log("Item merge steps: " + mergeMetadata.totalMerged);

	var aliasLookup = createAliasLookup(g_aliases);
	explodeItemAliases(g_data, aliasLookup);
}
mergeMetadata.totalMerged = 0;
function mergeMetadata(data, items, itemMetadata)
{
	// the scraping's not perfect, it's generating noisy item names 
	function scrubKeys(roughItems)
	{
		var retval = {};
		for (var roughKey in roughItems)
		{
			var scrubbedKey =  roughKey.toLowerCase().trim();
			retval[scrubbedKey] = roughItems[roughKey];
			retval[scrubbedKey].roughKey = roughKey;
		}
		return retval;
	}
	var scrubbedItems = scrubKeys(items);
	var scrubbedMetadata = scrubKeys(itemMetadata);

	for (var key in scrubbedItems)
	{
		var item = scrubbedItems[key];
		item.meta = scrubbedMetadata[key];
		if (!item.meta)
		{
			console.error("No metadata found for item '" + key + "'");
		}
		if (!item.dlc)
		{
			console.error("No dlc found for item '" + key + "'");
		}
		item.displayName = item.roughKey;

		var uniqueKey = key + item.dlc; // some DLC now collides item names (i.e. D12 in Antibirth)
		data.items[uniqueKey] = item;

		++mergeMetadata.totalMerged;
	}
}
function addProperty(itemTableArray, propertyName, value)
{
	itemTableArray.forEach(function(itemTable)
	{
		for (var key in itemTable)
		{
			var item = itemTable[key];
			item[propertyName] = value;
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

		item.itemTypeWithAliases = explodeAliases(aliasLookup, item.meta.itemType);
		item.itemTagsWithAliases = explodeAliases(aliasLookup, item.meta.itemTags);
		item.itemColorWithAliases = explodeAliases(aliasLookup, item.meta.itemColor);
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
	hitsContainer.innerHTML = g_data.showScore ? tableTemplateWithScore.textContent : tableTemplate.textContent;
	hits.forEach(function(hit) {

		if (!hit.item.rowHTML)
		{
			hit.item.rowHTML = renderRow(hit);
		}
		if (g_data.showScore)
		{
			hit.item.rowHTML.scoreCell.innerHTML = 	hit.score;
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
	nameParent.appendChild(document.createTextNode(hit.item.displayName));
	row.appendChild(cell);

	// image column
	cell = document.createElement('td');
	cell.className = "itemIconCell";

	var img = document.createElement('img');
	img.src = base64Thumbnails[hit.item.thumbnail] || hit.item.thumbnail;
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
	if (g_data.showScore)
	{
		cell = document.createElement('td');
		cell.className = "scoreCell";
		row.scoreCell = cell;
		row.appendChild(cell);	
	}
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
var OPTIONS =
{
	HEADER: "thefindingofisaac.11.",
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

	doSearch(getOption(OPTIONS.LASTSEARCH, DEFAULT_SEARCH_TERM));
}
var DEFAULT_SEARCH_TERM = "blue fly";
function main()
{
	prepareData(g_data);
	loading.style.display = "none";	

	// restore the last searched term and options
	restoreButtons();

	var lastSearch = getOption(OPTIONS.LASTSEARCH, DEFAULT_SEARCH_TERM);
	searchTerms.value = lastSearch; 
	searchTerms.select();

	doSearch(lastSearch);
}
