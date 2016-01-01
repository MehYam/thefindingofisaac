// TO DO:
// 1. data merge
// 2. hook up searching
// 3. results rendering
// 4. hand-tune supplemental data

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

var g_itemClasses = "activated passive card rune pill"

function prepareData(data)
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

prepareData(g_testData);

function retrieveHits(data, searchText)
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

function update()
{
	var terms = event.currentTarget.value;
	if (terms.length > 0)
	{
		var hits = retrieveHits(g_testData, event.currentTarget.value);
		console.log("hits " + hits.length);
	}
}