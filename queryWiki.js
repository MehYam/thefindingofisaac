const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const BASE_URL = 'https://bindingofisaacrebirth.fandom.com';
const CARGO_API = `${BASE_URL}/api.php`;
const CARGO_PAGE_SIZE = 500;
const CACHE_DIR = path.join(__dirname, '.wiki-cache');

// Usage:
//   node queryWiki.js collectible   -- fetch collectible table, save to cache, print report
//   node queryWiki.js trinket       -- fetch trinket table, save to cache, print report
//   node queryWiki.js pickup        -- fetch pickup table, save to cache, print report
//   node queryWiki.js merge         -- merge all cached tables into items.js, print report
const COMMAND = process.argv.find(a => !a.startsWith('-') && !a.includes('node') && !a.includes('.js'));

// dlc integer from wiki → our string format.
// Note: the wiki doesn't distinguish afterbirthplus from booster packs (both dlc=2).
// Booster pack items will come through as 'afterbirthplus' and may need manual correction.
const DLC_MAP = {
    // these might be stale
    0: 'base',
    1: 'afterbirth',
    2: 'afterbirthplus',
    3: 'repentance',

    // I can't explain the repeats here - some of these might be booster packs or
    // other updates
    4: 'afterbirthplus',
    8: 'repentance',
    12: 'afterbirthplus',
    14: 'afterbirth',
    15: 'base'
};

const CARGO_TABLES = [
    {
        table: 'collectible',
        fields: 'name,description,image,is_activated,dlc',
        toType: (row) => row.is_activated === '1' ? 'active' : 'passive',
    },
    {
        table: 'trinket',
        fields: 'name,description,image,dlc',
        toType: () => 'trinket',
    },
    {
        table: 'pickup',
        fields: 'name,description,image,type,dlc',
        toType: (row) => normalizePickupType(row.type),
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Cargo uses ► (U+25BA) as a GROUP_CONCAT row separator and ▼ (U+25BC) as a
// list-field delimiter. When multiple rows exist per item (e.g. DLC variants),
// field values get concatenated with these characters, often prefixed by the
// numeric id. Strip that noise and return the last meaningful segment.
function cleanCargoString(value) {
    if (!value) return '';
    const segments = value.split(/[►▼]/);
    for (let i = segments.length - 1; i >= 0; i--) {
        const s = segments[i].trim();
        if (s && !/^\d+$/.test(s)) return s;
    }
    return segments[segments.length - 1].trim();
}

// Standard MediaWiki image URL construction from a filename.
// Computes the MD5 hash of the filename to derive the two-level directory path.
function imageUrl(filename) {
    if (!filename) return '';
    const normalized = filename.replace(/ /g, '_');
    const hash = crypto.createHash('md5').update(normalized).digest('hex');
    return `https://static.wikia.nocookie.net/bindingofisaacre_gamepedia/images/${hash[0]}/${hash.slice(0, 2)}/${normalized}`;
}

function wikiUrl(name) {
    return `${BASE_URL}/wiki/${name.replace(/ /g, '_')}`;
}

function fixUpRelativeURLs(html) {
    return html.replace(/href="/g, `target="_blank" href="${BASE_URL}`);
}

const KNOWN_PICKUP_TYPES = new Set(['card', 'rune', 'soul']);
const pickupTypeWarnings = new Set();

function normalizePickupType(raw) {
    if (!raw) return 'card';
    const normalized = cleanCargoString(raw).toLowerCase();
    if (!KNOWN_PICKUP_TYPES.has(normalized) && !pickupTypeWarnings.has(normalized)) {
        pickupTypeWarnings.add(normalized);
    }
    return normalized;
}

function mapDlc(raw, warnings) {
    if (raw === null || raw === undefined || raw === '') return '';
    const cleaned = cleanCargoString(raw);
    const n = parseInt(cleaned, 10);
    if (n in DLC_MAP) return DLC_MAP[n];
    warnings.push(`Unknown dlc value: ${raw}`);
    return '';
}

// ─── Cargo API ────────────────────────────────────────────────────────────────

async function cargoQueryPage(table, fields, offset) {
    const params = new URLSearchParams({
        action: 'cargoquery',
        tables: table,
        fields,
        limit: String(CARGO_PAGE_SIZE),
        offset: String(offset),
        format: 'json',
    });
    const resp = await fetch(`${CARGO_API}?${params}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (json.error) throw new Error(`Cargo error: ${json.error.info}`);
    return json.cargoquery.map(entry => entry.title);
}

async function cargoQueryAll(table, fields) {
    const rows = [];
    let offset = 0;
    while (true) {
        const page = await cargoQueryPage(table, fields, offset);
        rows.push(...page);
        if (page.length < CARGO_PAGE_SIZE) break;
        offset += CARGO_PAGE_SIZE;
    }
    return rows;
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function cachePath(tableName) {
    return path.join(CACHE_DIR, `${tableName}.json`);
}

function saveCache(tableName, data) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(cachePath(tableName), JSON.stringify(data, null, 2), 'utf8');
}

function loadCache(tableName) {
    const p = cachePath(tableName);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// ─── Row processing ───────────────────────────────────────────────────────────

function rowsToItems(config, rows) {
    const result = { table: config.table, items: [], warnings: [] };

    for (const row of rows) {
        const name = cleanCargoString(row.name?.trim());
        if (!name) { result.warnings.push('Row with empty name skipped'); continue; }

        const imageFile = cleanCargoString(row.image?.trim());
        const thumb = imageUrl(imageFile);
        if (!thumb) result.warnings.push(`Missing image for: "${name}"`);

        const desc = row.description ? fixUpRelativeURLs(cleanCargoString(row.description)) : '';
        const dlc = mapDlc(row.dlc, result.warnings);
        const type = config.toType(row);

        result.items.push({
            id: name.toLowerCase(),
            name,
            type,
            subType: '',
            desc,
            dlc,
            colors: '',
            tags: '',
            thumb,
            wiki: wikiUrl(name),
        });
    }

    return result;
}

// ─── Data loading ─────────────────────────────────────────────────────────────

function loadExistingItems() {
    const itemsPath = path.join(__dirname, 'itemdata', 'items.js');
    const code = fs.readFileSync(itemsPath, 'utf8')
        .replace(/\bconst\s+g_items\b/, 'g_items');
    const sandbox = {};
    vm.runInNewContext(code, sandbox);
    return sandbox.g_items;
}

function readItemsFileHeader() {
    const code = fs.readFileSync(path.join(__dirname, 'itemdata', 'items.js'), 'utf8');
    const match = code.match(/^([\s\S]*?)(const g_items\s*=)/m);
    return match ? match[1] : '';
}

// ─── Merge ────────────────────────────────────────────────────────────────────
/**
 * items.js includes hand-edited color and tag metadata for each item - this function
 * merges a fresh fetch from the wiki with this existing item data.
 */
function mergeItems(existingItems, fetchedItems) {
    const existingMap = new Map(existingItems.map(item => [item.id, { ...item }]));
    const fetchedIds = new Set();
    const stats = { matched: 0, newItems: [], notFound: [] };

    for (const fetched of fetchedItems) {
        fetchedIds.add(fetched.id);
        if (existingMap.has(fetched.id)) {
            const existing = existingMap.get(fetched.id);
            // Update wiki-sourced fields; preserve hand-curated tags/colors/dlc/subType
            existing.desc = fetched.desc;
            existing.thumb = fetched.thumb;
            existing.wiki = fetched.wiki;
            // Only update dlc if it was blank (don't overwrite manual curation)
            if (!existing.dlc && fetched.dlc) existing.dlc = fetched.dlc;
            stats.matched++;
        } else {
            existingMap.set(fetched.id, fetched);
            stats.newItems.push(fetched);
        }
    }

    for (const item of existingItems) {
        if (!fetchedIds.has(item.id)) stats.notFound.push(item.id);
    }

    const merged = Array.from(existingMap.values()).sort((a, b) => a.id.localeCompare(b.id));
    return { merged, stats };
}

// ─── Output ───────────────────────────────────────────────────────────────────

function writeItemsFile(header, mergedItems) {
    const content = header + `const g_items = ${JSON.stringify(mergedItems, null, 1)};\n`;
    fs.writeFileSync(path.join(__dirname, 'itemdata', 'items.js'), content, 'utf8');
}

function printFetchReport(result) {
    console.log('\n' + '='.repeat(60));
    console.log(`FETCH REPORT: ${result.table}`);
    console.log('='.repeat(60));
    console.log(`  Rows fetched: ${result.rows.length}`);
    console.log(`  Saved to:     ${cachePath(result.table)}`);
    if (result.warnings.length > 0) {
        console.log(`  Warnings (${result.warnings.length}):`);
        for (const w of result.warnings) console.log(`    ${w}`);
    }
    console.log('='.repeat(60));
}

function printMergeReport(tableResults, mergeStats, existingCount, mergedCount) {
    console.log('\n' + '='.repeat(60));
    console.log('MERGE REPORT');
    console.log('='.repeat(60));

    let totalItems = 0;
    for (const tr of tableResults) {
        console.log(`\nTable: ${tr.table} — ${tr.items.length} items`);
        totalItems += tr.items.length;
        for (const w of tr.warnings) {
            console.log(`  WARNING: ${w}`);
        }
    }

    if (pickupTypeWarnings.size > 0) {
        console.log(`\n  Unknown pickup types (mapped as-is): ${[...pickupTypeWarnings].join(', ')}`);
    }

    console.log('\n' + '-'.repeat(60));
    console.log(`  Items from wiki:   ${totalItems}`);
    console.log(`  Existing (before): ${existingCount}`);
    console.log(`  Matched + updated: ${mergeStats.matched}`);
    console.log(`  New items:         ${mergeStats.newItems.length}`);
    console.log(`  Not on wiki:       ${mergeStats.notFound.length}`);
    console.log(`  Total (after):     ${mergedCount}`);

    if (mergeStats.matched === 0 && totalItems > 0) {
        console.log('\n  ### NO ITEMS MATCHED — something may be wrong with id mapping ###');
    }
    if (mergeStats.newItems.length > 0) {
        const PREVIEW = 10;
        console.log('\n  New items:');
        for (const item of mergeStats.newItems.slice(0, PREVIEW)) {
            console.log(`    + [${item.type}] ${item.id}`);
        }
        if (mergeStats.newItems.length > PREVIEW) {
            console.log(`    ...and ${mergeStats.newItems.length - PREVIEW} more`);
        }
    }
    if (mergeStats.notFound.length > 0) {
        const PREVIEW = 10;
        console.log('\n  Existing items not found on wiki (may be renamed or removed):');
        for (const id of mergeStats.notFound.slice(0, PREVIEW)) {
            console.log(`    - ${id}`);
        }
        if (mergeStats.notFound.length > PREVIEW) {
            console.log(`    ...and ${mergeStats.notFound.length - PREVIEW} more`);
        }
    }
    console.log('='.repeat(60));
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    if (COMMAND === 'merge') {
        const existingItems = loadExistingItems();
        const fileHeader = readItemsFileHeader();
        console.log(`Loaded ${existingItems.length} existing items.`);

        const tableResults = [];
        const allFetched = [];

        for (const config of CARGO_TABLES) {
            const cached = loadCache(config.table);
            if (!cached) {
                console.error(`Missing cache for '${config.table}'. Run: node queryWiki.js ${config.table}`);
                process.exit(1);
            }
            const result = rowsToItems(config, cached.rows);
            tableResults.push(result);
            allFetched.push(...result.items);
        }

        const { merged, stats } = mergeItems(existingItems, allFetched);
        printMergeReport(tableResults, stats, existingItems.length, merged.length);

        console.log(`\nWriting ${merged.length} items to itemdata/items.js...`);
        writeItemsFile(fileHeader, merged);
        console.log('Done.');

    } else if (COMMAND) {
        const config = CARGO_TABLES.find(t => t.table === COMMAND);
        if (!config) {
            console.error(`Unknown table '${COMMAND}'. Valid tables: ${CARGO_TABLES.map(t => t.table).join(', ')}`);
            process.exit(1);
        }

        console.log(`Querying ${config.table}...`);
        let rows;
        try {
            rows = await cargoQueryAll(config.table, config.fields);
        } catch (err) {
            console.error(`  ERROR: ${err.message}`);
            process.exit(1);
        }

        // Process rows now so warnings appear in the fetch report
        const processed = rowsToItems(config, rows);
        saveCache(config.table, { table: config.table, fields: config.fields, rows });
        printFetchReport({ table: config.table, rows, warnings: processed.warnings });

    } else {
        console.log('Usage:');
        console.log('  node queryWiki.js collectible   # fetch & cache collectible table');
        console.log('  node queryWiki.js trinket        # fetch & cache trinket table');
        console.log('  node queryWiki.js pickup         # fetch & cache pickup table');
        console.log('  node queryWiki.js merge          # merge all cached tables into items.js');
    }
}

main().catch(err => {
    console.error('\nFatal error:', err);
    process.exit(1);
});
