var g_data = 
{
	items: g_items,
	showScore: false,
	usePackedImgs: true,
};
var DLC =
{
	BASE: "base",
	AFTERBIRTH: "afterbirth",
	AFTERBIRTHPLUS: "afterbirthplus",
	ANTIBIRTH: "antibirth",
	BOOSTERPACK1: "boosterpack1",
	BOOSTERPACK2: "boosterpack2",
	BOOSTERPACK3: "boosterpack3",
	BOOSTERPACK4: "boosterpack4",
	BOOSTERPACK5: "boosterpack5"
}
function prepareData(data)
{
	console.log(`preparing ${g_data.items.length} items`);

	const dlcMissing = g_data.items.filter(item => !item.dlc || !item.dlc.length);
	if (dlcMissing.length) {
		console.warn(`${dlcMissing.length} items missing DLC: ${dlcMissing.map(i => i.name).join(',')}`);
	}

	const tagsMissing = g_data.items.filter(item => !item.tags || !item.tags.trim().length);
	if (tagsMissing.length) {
		console.warn(`${tagsMissing.length} items missing tags: ${tagsMissing.map(i => i.name).join(',')}`);
	}

	const localThumbnailMissing = g_data.items.filter(item => !base64Thumbnails[item.id]);
	if (localThumbnailMissing.length) {
		console.warn(`${localThumbnailMissing.length} items not using local thumbnails: ${localThumbnailMissing.map(i => i.name).join(',')}`);
	}

	var aliasLookup = createAliasLookup(g_aliases);
	explodeItemAliases(g_data, aliasLookup);
}
// for use during scraping
function mergeItems() {}

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
	for (const item of data.items) {
		item.aliases = {
			type: explodeAliases(aliasLookup, item.type),
			tags: explodeAliases(aliasLookup, item.tags),
			colors: explodeAliases(aliasLookup, item.colors)
		};
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
function retrieveHits(data, searchText, dlcFilter, searchTermsWithAND)
{
	console.log("-> retrieveHits");

	// split search into multiple terms
	var terms = searchText.split(' ');  // KAI: should maybe regexp for whitespace instead
	var nTerms = terms.length;

	var hits = [];
	for (const item of data.items.filter(i => dlcFilter[i.dlc]))
	{
		var score = 0;
		for (const term of terms)
		{
			var termScore = 0;

			// item name match
			if (item.name.indexOf(term) >= 0)
			{
				termScore += 10;
			}
			// type
			if (item.type.indexOf(term) >= 0)
			{
				termScore += 5;
			}
			if (item.aliases.type.indexOf(term) >= 0)
			{
				termScore += 3;
			}
			// color
			if (item.aliases.colors.indexOf(term) >= 0)
			{
				termScore += 2;
			}
			// tag hits
			if (item.aliases.tags.indexOf(term) >= 0)
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
		if (item.name.toLowerCase().indexOf(searchText.toLowerCase()) >= 0)
		{
			score += 20;
		}
		if (score)
		{
			hits.push({ item, score: score });
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

		if (!resultCount.hasOwnProperty(hit.item.type)) {
			resultCount[hit.item.type] = 0;
		}
		++resultCount[hit.item.type];
		++total;
	});
	console.log("<- renderHits, rendered", renderRow.stats.rendered, "base64 images used:", renderRow.stats.base64Used);

	var output = [];
	for (var r in resultCount) {
		output.push(`${resultCount[r]} ${r}s`);
	}
	resultsCount.textContent = total ? `${total} items (${output.join(', ')})` : 'none';
}
function renderRow(hit)
{
	var row = document.createElement('tr');

	// name column
	var cell = document.createElement('td');
	var nameParent = cell;
	if (hit.item.wiki)
	{
		var anchor = document.createElement('a');
		anchor.href = hit.item.wiki;
		anchor.target = "_blank";
		nameParent = anchor;

		cell.appendChild(anchor);
	}
	nameParent.appendChild(document.createTextNode(hit.item.name));
	row.appendChild(cell);

	// image column
	cell = document.createElement('td');
	cell.className = "itemIconCell";

	var thumbnail;
	if (g_data.usePackedImgs && base64Thumbnails[hit.item.id]) {
		thumbnail = base64Thumbnails[hit.item.id];

		++renderRow.stats.base64Used;
	}
	else {
		thumbnail = hit.item.thumb;
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
	cell.innerHTML = hit.item.desc;
	row.appendChild(cell);

	// type
	cell = document.createElement('td');
	cell.appendChild(document.createTextNode(hit.item.type));
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
	for (const item of data.items)
	{
		if (dlcFilter[item.dlc])
		{
			hits.push({ item, score: 0 });
		}
	}
	renderHits(hits);
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
	if (booster1button.checked) {
		dlcFilter[DLC.BOOSTERPACK1] = true;
		dlcFilter[DLC.BOOSTERPACK2] = true;
		dlcFilter[DLC.BOOSTERPACK3] = true;
		dlcFilter[DLC.BOOSTERPACK4] = true;
		dlcFilter[DLC.BOOSTERPACK5] = true;
	}
	if (anbbutton.checked) dlcFilter[DLC.ANTIBIRTH] = true;

	if (searchText.length)
	{
		var hits = retrieveHits(g_data, searchText, dlcFilter, true);
		hits.sort(function(hitA, hitB){
			return hitB.score - hitA.score;
		});
		renderHits(hits);
	}
	else
	{
		renderAll(g_data, dlcFilter);
	}
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
