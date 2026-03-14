// Vercel Serverless Function — SEO Oracle Dashboard API
const fs   = require('fs');
const path = require('path');

let _cache = null;

function getAll() {
    if (!_cache) {
        const p = path.join(process.cwd(), 'dashboard_data.json');
        _cache = JSON.parse(fs.readFileSync(p, 'utf8'));
    }
    return _cache;
}

const ALLOWED_SORT = new Set([
    'keyword','volume','kd','cpc','req_links','link_cost',
    'annual_rev','roi','intent','route','value','type',
    'trend','trend_yearly','competition','avg_ref_domains','main_domain_rank',
]);

module.exports = (req, res) => {
    const {
        search       = '',
        roi_filter   = 'positive',
        kd_filter    = 'all',
        batch_filter = 'all',
        root_filter  = 'all',
        sort         = 'roi',
        dir          = 'desc',
        page         = '1',
        limit        = '100',
    } = req.query;

    const all      = getAll();
    const sortCol  = ALLOWED_SORT.has(sort) ? sort : 'roi';
    const desc     = dir !== 'asc';
    const pageNum  = Math.max(1, parseInt(page)  || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit) || 100));

    let filtered = all.filter(row => {
        if (batch_filter !== 'all' && row.batch        !== batch_filter) return false;
        if (root_filter  !== 'all' && row.keyword_root !== root_filter)  return false;
        if (roi_filter === 'positive' && row.roi <= 0)    return false;
        if (roi_filter === 'high'     && row.roi <= 1000) return false;
        if (kd_filter  === 'low'  && row.kd > 15)              return false;
        if (kd_filter  === 'mid'  && (row.kd <= 15 || row.kd > 30)) return false;
        if (kd_filter  === 'high' && row.kd <= 30)             return false;
        if (search) {
            const s = `${row.keyword_root||''} ${row.keyword||''} ${row.intent||''} ${row.user_need||''} ${row.meaning||''} ${row.route||''}`.toLowerCase();
            if (!s.includes(search.toLowerCase())) return false;
        }
        return true;
    });

    filtered.sort((a, b) => {
        let va = a[sortCol] ?? '', vb = b[sortCol] ?? '';
        if (va === '' || va == null) return 1;
        if (vb === '' || vb == null) return -1;
        if (va < vb) return desc ? 1 : -1;
        if (va > vb) return desc ? -1 : 1;
        return 0;
    });

    const total    = filtered.length;
    const positive = filtered.filter(r => r.roi > 0).length;
    const offset   = (pageNum - 1) * limitNum;
    const batches  = [...new Set(all.map(r => r.batch).filter(Boolean))].sort().reverse();
    const roots    = [...new Set(all.map(r => r.keyword_root).filter(Boolean))].sort();

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    res.json({
        total, positive, page: pageNum, limit: limitNum,
        data: filtered.slice(offset, offset + limitNum),
        batches, roots,
    });
};
