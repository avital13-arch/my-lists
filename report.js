window._initReport = function () {
  'use strict';

  const REPORT_PATH = 'ports_locations_prices_report.md';
  const container = document.getElementById('report-content');
  if (!container) return;

  fetch(REPORT_PATH)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load report (${response.status})`);
      }
      return response.text();
    })
    .then(markdown => {
      container.innerHTML = markdownToHtml(markdown);
      container.querySelectorAll('a').forEach(a => {
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      });
    })
    .catch(err => {
      container.innerHTML = `<div class="report-error">Unable to load the report file. ${escapeHtml(err.message)}</div>`;
    });

  function markdownToHtml(markdown) {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    let i = 0;
    const out = [];

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        i += 1;
        continue;
      }

      if (/^#{1,6}\s+/.test(trimmed)) {
        const level = Math.min(6, (trimmed.match(/^#+/) || ['#'])[0].length);
        const text = trimmed.replace(/^#{1,6}\s+/, '');
        out.push(`<h${level}>${renderInline(text)}</h${level}>`);
        i += 1;
        continue;
      }

      if (isTableStart(lines, i)) {
        const headerCells = parseTableRow(lines[i]);
        i += 2;

        const bodyRows = [];
        while (i < lines.length && looksLikeTableRow(lines[i])) {
          bodyRows.push(parseTableRow(lines[i]));
          i += 1;
        }

        out.push(renderTable(headerCells, bodyRows));
        continue;
      }

      if (/^-\s+/.test(trimmed)) {
        const items = [];
        while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
          items.push(lines[i].trim().replace(/^-\s+/, ''));
          i += 1;
        }

        out.push('<ul>');
        items.forEach(item => out.push(`<li>${renderInline(item)}</li>`));
        out.push('</ul>');
        continue;
      }

      const para = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!current) break;
        if (/^#{1,6}\s+/.test(current) || /^-\s+/.test(current)) break;
        if (isTableStart(lines, i)) break;
        para.push(current);
        i += 1;
      }
      out.push(`<p>${renderInline(para.join(' '))}</p>`);
    }

    return out.join('\n');
  }

  function isTableStart(lines, idx) {
    if (idx + 1 >= lines.length) return false;
    return looksLikeTableRow(lines[idx]) && isTableSeparator(lines[idx + 1]);
  }

  function looksLikeTableRow(line) {
    return /^\s*\|.*\|\s*$/.test(line.trim());
  }

  function isTableSeparator(line) {
    return /^\s*\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|\s*$/.test(line.trim());
  }

  function parseTableRow(line) {
    return line
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim());
  }

  function renderTable(headers, rows) {
    const thead = `<thead><tr>${headers.map(h => `<th>${renderInline(h)}</th>`).join('')}</tr></thead>`;
    const tbodyRows = rows
      .map(row => `<tr>${row.map(cell => `<td>${renderInline(cell)}</td>`).join('')}</tr>`)
      .join('');
    const tbody = `<tbody>${tbodyRows}</tbody>`;
    return `<div class="report-table-wrap"><table>${thead}${tbody}</table></div>`;
  }

  function renderInline(text) {
    let html = escapeHtml(text);

    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, label, url) => {
      return `<a href="${escapeAttr(url)}">${label}</a>`;
    });

    html = autoLinkOutsideAnchors(html);
    return html;
  }

  function autoLinkOutsideAnchors(html) {
    const parts = html.split(/(<a\s+[^>]*>[\s\S]*?<\/a>)/gi);
    return parts
      .map(part => {
        if (/^<a\s+/i.test(part)) return part;
        return part.replace(/(https?:\/\/[^\s<]+)/g, url => `<a href="${escapeAttr(url)}">${url}</a>`);
      })
      .join('');
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return String(value).replace(/"/g, '&quot;');
  }
};
