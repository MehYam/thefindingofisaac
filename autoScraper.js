const fetch = require('node-fetch');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE_URL = 'https://bindingofisaacrebirth.fandom.com';
const DRY_RUN = process.argv.includes('--dry-run');

// Cards_and_Runes has 15 tables (0-14); type is auto-detected from column headers.
// Items has 2 tables: 0=passive, 1=active. Trinkets has 1 table: 0=trinket.
const TARGETS = [
    {
        url: `${BASE_URL}/wiki/Items`,
        tables: [
            { index: 0, type: 'passive' },
            { index: 1, type: 'active' },
        ],
    },
    {
        url: `${BASE_URL}/wiki/Trinkets`,
        tables: [
            { index: 0, type: 'trinket' },
        ],
    },
    {
        url: `${BASE_URL}/wiki/Cards_and_Runes`,
        tables: Array.from({ length: 15 }, (_, i) => ({ index: i, type: 'auto' })),
    },
];

// ─── Data loading ────────────────────────────────────────────────────────────

function loadExistingItems() {
    const itemsPath = path.join(__dirname, 'itemdata', 'items.js');
    const code = fs.readFileSync(itemsPath, 'utf8');
    const sandbox = {};
    vm.runInNewContext(code, sandbox);
    return sandbox.g_items;
}

function readItemsFileHeader() {
    const itemsPath = path.join(__dirname, 'itemdata', 'items.js');
    const code = fs.readFileSync(itemsPath, 'utf8');
    // Preserve everything before the g_items declaration
    const match = code.match(/^([\s\S]*?)(const g_items\s*=)/m);
    return match ? match[1] : '';
}

// ─── Scraping helpers ─────────────────────────────────────────────────────────

function getImageUrl(img) {
    // Fandom lazy-loads images; real URL is in data-src before the image scrolls into view
    return img.attr('data-src') || img.attr('src') || '';
}

function stripRevision(url) {
    return url.split('/revision')[0];
}

function fixUpRelativeURLs(html) {
    return html.replace(/href="/g, `target="_blank" href="${BASE_URL}`);
}

function detectColumns($, headerRow) {
    const opts = { nameCol: undefined, iconCol: undefined, descCol: undefined, detectedType: null };
    $(headerRow).find('th, td').each((i, cell) => {
        const header = $(cell).text().trim().toLowerCase();
        switch (header) {
            case 'name':
                opts.nameCol = i;
                break;
            case 'rune':
                opts.nameCol = i;
                opts.detectedType = 'rune';
                break;
            case 'icon':
                opts.iconCol = i;
                break;
            case 'effect':
            case 'collapseeffect':
            case 'description':
            case 'collapsedescription':
            case 'collapsedesciption': // matches typo in original scraper.js
                opts.descCol = i;
                break;
        }
    });
    return opts;
}

function scrapeTable($, tableEl, config) {
    const result = {
        tableIndex: config.index,
        type: config.type,
        typeAutoDetected: false,
        columnHeaders: [],
        columnsDetected: false,
        items: [],
        skipped: 0,
        warnings: [],
    };

    // Get header row - prefer thead, fall back to first tr
    const thead = $(tableEl).find('thead tr').first();
    const headerRow = thead.length ? thead : $(tableEl).find('tr').first();

    $(headerRow).find('th, td').each((_, cell) => {
        result.columnHeaders.push($(cell).text().trim());
    });

    const opts = detectColumns($, headerRow);

    if (opts.nameCol === undefined || opts.iconCol === undefined || opts.descCol === undefined) {
        result.warnings.push(`Column detection failed. Headers: [${result.columnHeaders.join(', ')}]`);
        return result;
    }
    result.columnsDetected = true;

    if (config.type === 'auto') {
        result.type = opts.detectedType || 'card';
        result.typeAutoDetected = true;
    }

    const rows = $(tableEl).find('tr').toArray();
    const dataRows = rows.slice(1); // skip header

    for (let r = 0; r < dataRows.length; ++r) {
        const row = dataRows[r];
        const cells = $(row).children('td');
        if (cells.length === 0) continue; // sub-header or spacer row

        try {
            const nameCell = cells.eq(opts.nameCol);
            const name = nameCell.text().trim();
            if (!name) { result.skipped++; continue; }

            const id = name.toLowerCase();

            const anchor = nameCell.find('a').first();
            const wikiHref = anchor.attr('href') || '';
            const wiki = wikiHref.startsWith('http') ? wikiHref : `${BASE_URL}${wikiHref}`;

            const img = cells.eq(opts.iconCol).find('img').first();
            const rawThumb = getImageUrl(img);
            const thumb = rawThumb ? stripRevision(rawThumb) : '';
            if (!thumb) result.warnings.push(`Missing thumbnail: "${name}"`);

            const descHtml = cells.eq(opts.descCol).html() || '';
            const desc = fixUpRelativeURLs(descHtml.trim());

            result.items.push({ id, name, type: result.type, wiki, thumb, desc });
        } catch (err) {
            result.skipped++;
            result.warnings.push(`Row ${r + 1}: ${err.message}`);
        }
    }

    return result;
}

// ─── Page fetching ────────────────────────────────────────────────────────────

async function scrapePage(target) {
    const pageResult = {
        url: target.url,
        fetchError: null,
        tableInventory: [],
        tableResults: [],
    };

    let html;
    try {
        const resp = await fetch(target.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        html = await resp.text();
    } catch (err) {
        pageResult.fetchError = err.message;
        return pageResult;
    }

    const $ = cheerio.load(html);
    const allTables = $('table').toArray();

    // Inventory all tables on the page (like listTables())
    pageResult.tableInventory = allTables.map((tbl, i) => {
        const rows = $(tbl).find('tr');
        if (rows.length < 2) return { index: i, empty: true };
        const headers = $(rows[0]).find('th, td').map((_, c) => $(c).text().trim()).toArray();
        const firstCell = $(rows[1]).find('td, th').first().text().trim().slice(0, 50);
        return { index: i, headers, firstCell };
    });

    for (const config of target.tables) {
        if (config.index >= allTables.length) {
            pageResult.tableResults.push({
                tableIndex: config.index,
                type: config.type,
                columnsDetected: false,
                items: [],
                skipped: 0,
                warnings: [`Table index ${config.index} not found (page has ${allTables.length} tables)`],
            });
            continue;
        }
        pageResult.tableResults.push(scrapeTable($, allTables[config.index], config));
    }

    return pageResult;
}

// ─── Merge ────────────────────────────────────────────────────────────────────

function mergeItems(existingItems, scrapedItems) {
    const existingMap = new Map(existingItems.map(item => [item.id, { ...item }]));
    const scrapedIds = new Set();
    const stats = { matched: 0, newItems: [], notFound: [] };

    for (const scraped of scrapedItems) {
        scrapedIds.add(scraped.id);
        if (existingMap.has(scraped.id)) {
            const existing = existingMap.get(scraped.id);
            existing.desc = scraped.desc;
            existing.thumb = scraped.thumb;
            existing.wiki = scraped.wiki;
            stats.matched++;
        } else {
            const newItem = {
                id: scraped.id,
                name: scraped.name,
                type: scraped.type,
                subType: '',
                desc: scraped.desc,
                dlc: '',
                colors: '',
                tags: '',
                thumb: scraped.thumb,
                wiki: scraped.wiki,
            };
            existingMap.set(scraped.id, newItem);
            stats.newItems.push(newItem);
        }
    }

    for (const item of existingItems) {
        if (!scrapedIds.has(item.id)) {
            stats.notFound.push(item.id);
        }
    }

    const merged = Array.from(existingMap.values()).sort((a, b) => a.id.localeCompare(b.id));
    return { merged, stats };
}

// ─── Output ───────────────────────────────────────────────────────────────────

function writeItemsFile(header, mergedItems) {
    const itemsPath = path.join(__dirname, 'itemdata', 'items.js');
    const content = header + `const g_items = ${JSON.stringify(mergedItems, null, 1)};\n`;
    fs.writeFileSync(itemsPath, content, 'utf8');
}

function printReport(pageResults, mergeStats, existingCount, mergedCount) {
    let totalAttempted = 0, totalSucceeded = 0, totalFailed = 0;
    let totalScraped = 0, totalSkipped = 0;

    console.log('\n' + '='.repeat(60));
    console.log('SCRAPE REPORT');
    console.log('='.repeat(60));

    for (const page of pageResults) {
        console.log(`\nPage: ${page.url}`);
        if (page.fetchError) {
            console.log(`  FETCH ERROR: ${page.fetchError}`);
            continue;
        }
        console.log(`  Tables on page: ${page.tableInventory.length}`);
        console.log('  Table inventory:');
        for (const t of page.tableInventory) {
            if (t.empty) {
                console.log(`    [${t.index}] (empty)`);
            } else {
                console.log(`    [${t.index}] headers: [${t.headers.join(', ')}]  first: "${t.firstCell}"`);
            }
        }

        console.log('  Scrape results:');
        for (const tr of page.tableResults) {
            totalAttempted++;
            const typeLabel = tr.typeAutoDetected ? `${tr.type} (auto-detected)` : tr.type;
            if (tr.columnsDetected) {
                totalSucceeded++;
                totalScraped += tr.items.length;
                totalSkipped += tr.skipped;
                console.log(`    [${tr.tableIndex}] ${typeLabel}: ${tr.items.length} items, ${tr.skipped} skipped`);
            } else {
                totalFailed++;
                console.log(`    [${tr.tableIndex}] ${typeLabel}: FAILED (column detection)`);
            }
            for (const w of tr.warnings) {
                console.log(`      WARNING: ${w}`);
            }
        }
    }

    console.log('\n' + '-'.repeat(60));
    console.log('TOTALS');
    console.log(`  Tables attempted:   ${totalAttempted}`);
    console.log(`  Tables succeeded:   ${totalSucceeded}`);
    console.log(`  Tables failed:      ${totalFailed}`);
    console.log(`  Items scraped:      ${totalScraped}`);
    console.log(`  Rows skipped:       ${totalSkipped}`);

    console.log('\nMERGE');
    console.log(`  Existing items (before): ${existingCount}`);
    console.log(`  Matched + updated:       ${mergeStats.matched}`);
    console.log(`  New items appended:      ${mergeStats.newItems.length}`);
    console.log(`  Existing not on wiki:    ${mergeStats.notFound.length}`);
    console.log(`  Total items (after):     ${mergedCount}`);

    if (mergeStats.newItems.length > 0) {
        console.log('\n  New items:');
        for (const item of mergeStats.newItems) {
            console.log(`    + [${item.type}] ${item.id}`);
        }
    }
    if (mergeStats.notFound.length > 0) {
        console.log('\n  Existing items not found on wiki (may be renamed or removed):');
        for (const id of mergeStats.notFound) {
            console.log(`    - ${id}`);
        }
    }

    console.log('='.repeat(60));
    if (DRY_RUN) console.log('DRY RUN — items.js was not modified.');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log('Loading existing items...');
    const existingItems = loadExistingItems();
    const fileHeader = readItemsFileHeader();
    console.log(`  Loaded ${existingItems.length} existing items.`);

    const pageResults = [];
    const allScraped = [];

    for (const target of TARGETS) {
        console.log(`Fetching ${target.url}...`);
        const pageResult = await scrapePage(target);
        pageResults.push(pageResult);
        for (const tr of pageResult.tableResults) {
            allScraped.push(...tr.items);
        }
    }

    console.log(`\nMerging ${allScraped.length} scraped items with ${existingItems.length} existing...`);
    const { merged, stats } = mergeItems(existingItems, allScraped);

    printReport(pageResults, stats, existingItems.length, merged.length);

    if (!DRY_RUN) {
        console.log(`\nWriting ${merged.length} items to itemdata/items.js...`);
        writeItemsFile(fileHeader, merged);
        console.log('Done.');
    }
}

main().catch(err => {
    console.error('\nFatal error:', err);
    process.exit(1);
});
