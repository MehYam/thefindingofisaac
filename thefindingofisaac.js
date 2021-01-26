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
	ANTIBIRTH: "antibirth",
	BOOSTERPACK: "boosterpack1"
}
var CLASSES = 
{
	TRINKET: "trinket",
	ACTIVE: "active",
	PASSIVE: "passive",
	CARD: "card",
	RUNE: "rune"
}
function prepareData(data)
{
	var CLASS_PROP = "itemClass";
	var cardsList = [cards1, cards2, cards3, cards4];
	var runesList = [runes1, runes2, runes3, runes4];

	addProperty([trinkets], CLASS_PROP, CLASSES.TRINKET);
	addProperty([itemsActivated], CLASS_PROP, CLASSES.ACTIVE);
	addProperty([itemsPassive], CLASS_PROP, CLASSES.PASSIVE);
	addProperty(cardsList, CLASS_PROP, CLASSES.CARD);
	addProperty(runesList, CLASS_PROP, CLASSES.RUNE);

	addItems(data, trinkets);
	addItems(data, itemsActivated);
	addItems(data, itemsPassive);
	cardsList.forEach(function(items){
		addItems(data, items);
	});
	runesList.forEach(function(items){
		addItems(data, items);
	})

	var DLC_PROP = "dlc";
	function mergeTagsAndSetDLC(data, dlc, tagsList) {
		addProperty(tagsList, DLC_PROP, dlc);
		tagsList.forEach(function(tags){
			mergeTags(data, tags);
		});
	}

	mergeTagsAndSetDLC(data, DLC.BASE, [rebirthTrinketsTags, rebirthCollectiblesTags, rebirthPassivesTags]);
	mergeTagsAndSetDLC(data, DLC.BASE, [cardsTags, cardsOtherTags, cardsPlayingTags, cardsSpecialTags, runes1Tags, runes2Tags]);
	mergeTagsAndSetDLC(data, DLC.AFTERBIRTH, [afterbirthTrinketsTags, afterbirthCollectiblesTags, afterbirthPassivesTags]);
	mergeTagsAndSetDLC(data, DLC.AFTERBIRTHPLUS, [afterbirthPlusTrinketsTags, afterbirthPlusCollectiblesTags, afterbirthPlusPassivesTags]);
	mergeTagsAndSetDLC(data, DLC.BOOSTERPACK, [boosterpack1TrinketsMeta, boosterpack1CollectiblesMeta, boosterpack1PassivesMeta, boosterpack1CardsMeta]);
	mergeTagsAndSetDLC(data, DLC.BOOSTERPACK, [boosterpack2TrinketsMeta, boosterpack2CollectiblesMeta, boosterpack2PassivesMeta]);
	mergeTagsAndSetDLC(data, DLC.BOOSTERPACK, [boosterpack3TrinketsMeta, boosterpack3CollectiblesMeta, boosterpack3PassivesMeta]);
	mergeTagsAndSetDLC(data, DLC.BOOSTERPACK, [boosterpack4TrinketsMeta, boosterpack4PassivesMeta]);
	mergeTagsAndSetDLC(data, DLC.BOOSTERPACK, [boosterpack5TrinketsMeta, boosterpack5CollectiblesMeta, boosterpack5PassivesMeta]);

/*
	addTags(data, antibirthPassivesTags);
	addTags(data, antibirthCollectiblesTags);
	addTags(data, antibirthTrinketsTags);
	addTags(data, runesAntibirthMeta);
*/

	// further data sanity checks
	for (var itemKey in data.items) {
		var item = data.items[itemKey];
		if (!item.meta) {
			console.error("no tags found for", itemKey);
		}
		else if (!item.meta.dlc) {
			console.error("no dlc found for", itemKey);
		}
	}
	console.log("items added: ", addItems.totalAdded, ", items tagged: ", mergeTags.totalTagged);

	fixUpRelativeURLs(data);


	var aliasLookup = createAliasLookup(g_aliases);
	explodeItemAliases(g_data, aliasLookup);
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
function scrubKeys(roughItems)
{
	var retval = {};
	for (var roughKey in roughItems)
	{
		var scrubbedKey =  roughKey.toLowerCase().trim();
		retval[scrubbedKey] = roughItems[roughKey];
		retval[scrubbedKey].key = scrubbedKey;
		retval[scrubbedKey].roughKey = roughKey;
	}
	return retval;
}
function addItems(data, items)
{
	var scrubbedItems = scrubKeys(items);
	for (var key in scrubbedItems) {
		var item = scrubbedItems[key];
		item.displayName = item.roughKey;

		if (data.items[key]) {
			console.error("Duplicate entry found for item '", key, "'", item, data.items[key]);
			continue;
		}
		data.items[key] = item;
		++addItems.totalAdded;
	}
}
addItems.totalAdded = 0;
function mergeTags(data, tags)
{
	// the scraping's not perfect, it's generating noisy item names 
	var scrubbedTags = scrubKeys(tags);
	for (var key in scrubbedTags) {
		var tags = scrubbedTags[key];

		var item = data.items[key];
		if (!item) {
			console.error("Trying to apply tag to non-existent item:", key, tags);
			continue;
		}
		item.meta = tags;
		++mergeTags.totalTagged;
	}
}
mergeTags.totalTagged = 0;

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
		if (!dlcFilter[item.meta.dlc])
		{
			continue;
		}

		var score = 0;
		for (var i = 0; i < nTerms; ++i)
		{
			var term = terms[i];
			var termScore = 0;

			// item name match
			if (item.displayName.indexOf(term) >= 0)
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
	console.log("<- retrieveHits found", hits.length);
	return hits;
}
function renderHits(hits)
{
	console.log("-> renderHits");

	resetRenderRowStats();

	hitsContainer.innerHTML = g_data.showScore ? tableTemplateWithScore.textContent : tableTemplate.textContent;

	var resultCount = { };
	var total = 0;
	hits.forEach(function(hit) {

		if (!hit.item.rowHTML)
		{
			// cache the row node, so we render it just once
			hit.item.rowHTML = renderRow(hit);
		}
		if (g_data.showScore)
		{
			hit.item.rowHTML.scoreCell.innerHTML = 	hit.score;
		}
		hitsTable.tBodies[0].appendChild(hit.item.rowHTML);

		if (!resultCount.hasOwnProperty(hit.item.itemClass)) {
			resultCount[hit.item.itemClass] = 0;
		}
		++resultCount[hit.item.itemClass];
		++total;
	});
	console.log("<- renderHits, rendered", renderRow.stats.rendered, "base64 images used:", renderRow.stats.base64Used);

	var output = [];
	for (var r in resultCount) {
		output.push(`${resultCount[r]} ${r}s`);
	}
	resultsCount.textContent = `${total} items (${output.join(', ')})`;
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

	var thumbnail;
	if (base64Thumbnails[hit.item.key]) {
		thumbnail = base64Thumbnails[hit.item.key];

		++renderRow.stats.base64Used;
	}
	else {
		thumbnail = hit.item.thumbnail;
	}
	if (thumbnail)
	{
		var img = document.createElement('img');
		img.src = thumbnail;
		img.className = "itemIcon";
		cell.appendChild(img);
	}
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
	++renderRow.stats.rendered;
	return row;
}
function resetRenderRowStats () { renderRow.stats = {rendered: 0, base64Used: 0}; }
resetRenderRowStats();

function renderAll(data, dlcFilter)
{
	var hits = [];
	for (var key in data.items)
	{
		var item = data.items[key];
		if (dlcFilter[item.meta.dlc])
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
	if (booster1button.checked) dlcFilter[DLC.BOOSTERPACK] = true;
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
}
function tallyResults(hits) {

}
var OPTIONS =
{
	HEADER: "thefindingofisaac.11.",
	LASTSEARCH: "lastSearch",
	REBIRTH: "rebirth",
	AFTERBIRTH: "afterbirth",
	AFTERBIRTHPLUS: "afterbirthplus",
	ANTIBIRTH: "antibirth",
	BOOSTERPACK: "boosterpack1"
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
	booster1button.checked = getOption(OPTIONS.BOOSTERPACK, true);

	anbbutton.checked = getOption(OPTIONS.ANTIBIRTH, true);
}
function onSearchOption()
{
	saveOption(OPTIONS.REBIRTH, rbbutton.checked);
	saveOption(OPTIONS.AFTERBIRTH, abbutton.checked);
	saveOption(OPTIONS.AFTERBIRTHPLUS, abplusbutton.checked);
	saveOption(OPTIONS.ANTIBIRTH, anbbutton.checked);
	saveOption(OPTIONS.BOOSTERPACK, booster1button.checked);

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
