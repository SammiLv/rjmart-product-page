/**
 * 页脚版权信息动态加载
 */

function escapeHtml(str) {
  if (str == null) {
    return '';
  }
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, '&#96;');
}

function normalizeWhitespace(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 后端可能返回数字或字符串 "2" / "3"，严格 === 会导致外链分支整条失效。
 */
function normalizeClickType(raw) {
  const n = Number(raw);
  if (Number.isFinite(n) && (n === 1 || n === 2 || n === 3)) {
    return n;
  }
  return NaN;
}

function isLinkClickType(ct) {
  return ct === 2 || ct === 3;
}

/** 兼容多种字段名 */
function pickLogoRaw(item) {
  if (!item || typeof item !== 'object') {
    return '';
  }
  const keys = ['logoUrl', 'logo', 'iconUrl', 'imageUrl', 'picUrl', 'icon'];
  for (const k of keys) {
    const v = item[k];
    if (v != null && String(v).trim() && String(v).trim() !== ' ') {
      return String(v).trim();
    }
  }
  return '';
}

function pickAttachRaw(item) {
  if (!item || typeof item !== 'object') {
    return '';
  }
  const keys = ['attachment', 'link', 'url', 'href', 'jumpUrl', 'attachmentUrl', 'targetUrl'];
  for (const k of keys) {
    const v = item[k];
    if (v != null && String(v).trim() && String(v).trim() !== ' ') {
      return String(v).trim();
    }
  }
  return '';
}

function pickDisplayText(item) {
  if (!item) {
    return '';
  }
  return normalizeWhitespace(item.displayNameCn || item.displayNameEn || item.displayName || item.title || '');
}

/**
 * 接口常返回相对路径；在 GitHub Pages 上会按当前域名解析导致裂图。
 * 统一补全为网关绝对地址（与 request.js 中 API_CONFIG.baseURL 一致）。
 */
function resolveAssetUrl(raw) {
  if (raw == null || typeof raw !== 'string') {
    return '';
  }
  const u = raw.trim();
  if (!u || u === ' ') {
    return '';
  }
  if (/^https?:\/\//i.test(u)) {
    return u;
  }
  if (u.startsWith('//')) {
    return `${window.location.protocol}${u}`;
  }
  const base = window.RjRequest?.API_CONFIG?.baseURL || '';
  if (!base) {
    return u;
  }
  const baseNorm = base.replace(/\/$/, '');
  if (u.startsWith('/')) {
    return `${baseNorm}${u}`;
  }
  return `${baseNorm}/${u}`;
}

/** 取排序权重：兼容多种后端字段名 */
function sortKey(obj, fallback = 0) {
  if (!obj || typeof obj !== 'object') {
    return fallback;
  }
  const v =
    obj.sort ??
    obj.sortNum ??
    obj.order ??
    obj.columnSort ??
    obj.rowSort ??
    obj.index ??
    obj.seq;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function sortRowBottoms(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }
  return [...rows].sort((a, b) => sortKey(a) - sortKey(b));
}

function columnStructuralSignature(col) {
  const item = col && col.bottom;
  if (!item) {
    return '';
  }
  const text = pickDisplayText(item);
  const logoRaw = pickLogoRaw(item);
  const logoResolved = logoRaw ? resolveAssetUrl(logoRaw) : '';
  const attachRaw = pickAttachRaw(item);
  const hrefResolved = attachRaw ? resolveAssetUrl(attachRaw) : '';
  const ct = normalizeClickType(item.clickType);
  const ctStr = Number.isFinite(ct) ? String(ct) : String(item.clickType ?? '');
  return [ctStr, text, logoResolved, hrefResolved].join('\u0001');
}

/**
 * 同一行内：规范化文案相同的多条配置合并为一条，优先保留「带 logo」的那条，
 * 避免后端拆成「只有字 / 只有图 / 图+字」导致同一备案文案出现两次。
 */
function pickBestDuplicateColumn(group) {
  if (group.length === 1) {
    return group[0];
  }
  let best = group[0];
  let bestHasLogo = Boolean(pickLogoRaw(best.bottom));
  for (let i = 1; i < group.length; i++) {
    const col = group[i];
    const hasLogo = Boolean(pickLogoRaw(col.bottom));
    if (hasLogo && !bestHasLogo) {
      best = col;
      bestHasLogo = true;
    } else if (hasLogo === bestHasLogo && sortKey(col) < sortKey(best)) {
      best = col;
    }
  }
  return best;
}

function dedupePreferringLogo(sortedCols) {
  const groups = new Map();
  const keyOrder = [];
  sortedCols.forEach((col, idx) => {
    const item = col && col.bottom;
    if (!item) {
      return;
    }
    const text = pickDisplayText(item);
    const logoRaw = pickLogoRaw(item);
    const key = text || `__logo_only__${logoRaw ? resolveAssetUrl(logoRaw) : `__idx_${idx}`}`;
    if (!groups.has(key)) {
      groups.set(key, []);
      keyOrder.push(key);
    }
    groups.get(key).push(col);
  });

  return keyOrder.map(k => pickBestDuplicateColumn(groups.get(k)));
}

function normalizeColumnBottoms(columnBottoms) {
  if (!Array.isArray(columnBottoms)) {
    return [];
  }
  const filtered = columnBottoms.filter(col => {
    const item = col && col.bottom;
    if (!item) {
      return false;
    }
    const text = pickDisplayText(item);
    const logoUrl = pickLogoRaw(item);
    return Boolean(text || logoUrl);
  });
  const sorted = filtered.sort((a, b) => sortKey(a) - sortKey(b));

  const seenStruct = new Set();
  const dedupedStruct = [];
  for (const col of sorted) {
    const sig = columnStructuralSignature(col);
    if (seenStruct.has(sig)) {
      continue;
    }
    seenStruct.add(sig);
    dedupedStruct.push(col);
  }

  return dedupePreferringLogo(dedupedStruct);
}

async function loadFooterLegalInfo() {
  console.log('开始加载页脚版权信息...');

  try {
    if (!window.RjRequest) {
      console.error('RjRequest 未定义');
      return;
    }

    const { api } = window.RjRequest;
    console.log('调用接口...');

    const result = await api.post('/store/config/anonymous/getWebsiteBottomConfigs', {
      domain: 'srm.test.rj-info.com'
    });

    console.log('接口返回数据:', result);

    if (!result || !result.sortBottoms || !result.sortBottoms.length) {
      console.warn('页脚版权信息接口返回数据为空');
      return;
    }

    const config = result.sortBottoms[0];
    const rowBottoms = sortRowBottoms(config.rowBottoms);

    if (!rowBottoms.length) {
      console.warn('页脚版权信息行数据为空');
      return;
    }

    console.log('开始渲染页脚...');

    const legalRoot = document.querySelector('.footer-legal');

    const line1Container = document.getElementById('footer-legal-line1');
    if (line1Container && rowBottoms[0]) {
      renderFooterLine(line1Container, rowBottoms[0].columnBottoms);
      console.log('第一行渲染完成');
    }

    const line2Container = document.getElementById('footer-legal-line2');
    if (line2Container) {
      if (rowBottoms[1]) {
        renderFooterLine(line2Container, rowBottoms[1].columnBottoms);
        console.log('第二行渲染完成');
      } else {
        line2Container.innerHTML = '';
      }
    }

    legalRoot?.classList.add('footer-legal--from-api');
  } catch (error) {
    console.error('加载页脚版权信息失败:', error);
  }
}

function renderFooterLine(container, columnBottoms) {
  const cols = normalizeColumnBottoms(columnBottoms);
  if (!cols.length) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = cols
    .map((col, index) => {
      const item = col.bottom;
      if (!item) {
        return '';
      }
      const chunk = renderFooterCell(item);
      const divider = index < cols.length - 1 ? '<span class="footer-divider">|</span>' : '';
      return chunk + divider;
    })
    .join('');
}

function imgTagForFooter(src, opts = {}) {
  const { alt = '', wrapReferrer = true } = opts;
  const ref = wrapReferrer ? ' referrerpolicy="no-referrer"' : '';
  return `<img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" class="footer-legal-inline-icon" loading="lazy" decoding="async"${ref} onerror="this.remove()" />`;
}

/**
 * 单个备案格子：外链类型下图标与文案合并为同一个 <a>。
 */
function renderFooterCell(item) {
  const text = pickDisplayText(item);
  const logoRaw = pickLogoRaw(item);
  const logoUrl = logoRaw ? resolveAssetUrl(logoRaw) : '';
  const ct = normalizeClickType(item.clickType);
  const attachRaw = pickAttachRaw(item);
  const attachment = attachRaw ? resolveAssetUrl(attachRaw) : '';

  const textHtml = escapeHtml(text);

  const hasLink = Boolean(attachment && isLinkClickType(ct));
  if (hasLink && (logoUrl || text)) {
    const innerParts = [];
    if (logoUrl) {
      innerParts.push(imgTagForFooter(logoUrl, { alt: '' }));
    }
    if (text) {
      innerParts.push(`<span class="footer-legal-cell-text">${textHtml}</span>`);
    }
    const inner = innerParts.join('');
    if (ct === 3) {
      return `<a href="${escapeAttr(attachment)}" target="_blank" rel="noopener noreferrer" download class="footer-legal-inline-link footer-legal-cell footer-legal-cell-link">${inner}</a>`;
    }
    return `<a href="${escapeAttr(attachment)}" target="_blank" rel="noopener noreferrer" class="footer-legal-inline-link footer-legal-cell footer-legal-cell-link">${inner}</a>`;
  }

  const parts = [];
  if (logoUrl) {
    parts.push(imgTagForFooter(logoUrl, { alt: text || 'icon' }));
  }
  if (text) {
    if (isLinkClickType(ct) && attachment) {
      if (ct === 3) {
        parts.push(
          `<a href="${escapeAttr(attachment)}" target="_blank" rel="noopener noreferrer" download class="footer-legal-inline-link">${textHtml}</a>`
        );
      } else {
        parts.push(
          `<a href="${escapeAttr(attachment)}" target="_blank" rel="noopener noreferrer" class="footer-legal-inline-link">${textHtml}</a>`
        );
      }
    } else {
      parts.push(`<span>${textHtml}</span>`);
    }
  }
  return `<span class="footer-legal-cell">${parts.join('')}</span>`;
}

function waitForRjRequest() {
  if (window.RjRequest) {
    loadFooterLegalInfo();
  } else {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.RjRequest) {
        clearInterval(checkInterval);
        loadFooterLegalInfo();
      } else if (attempts > 100) {
        clearInterval(checkInterval);
        console.error('RjRequest 加载超时');
      }
    }, 50);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForRjRequest);
} else {
  waitForRjRequest();
}
