function buildCommentBlock(comments) {
  return '\n' + comments.map(c => `<!-- ${c} -->`).join('\n') + '\n';
}

export function injectHtml(html, comments, position) {
  if (typeof html !== 'string' || html.length === 0) return html;
  if (!Array.isArray(comments) || comments.length === 0) return html;

  const block = buildCommentBlock(comments);
  const pos = (position || 'after-doctype').toLowerCase();

  switch (pos) {
    case 'top':
      return block + html;

    case 'bottom':
      return html + block;

    case 'after-doctype': {
      const doctypeMatch = html.match(/<!doctype\s+html[^>]*>/i);
      if (doctypeMatch) {
        const idx = doctypeMatch.index + doctypeMatch[0].length;
        return html.slice(0, idx) + block + html.slice(idx);
      }
      // Fallback to top
      return block + html;
    }

    case 'head-start': {
      const headMatch = html.match(/<head[^>]*>/i);
      if (headMatch) {
        const idx = headMatch.index + headMatch[0].length;
        return html.slice(0, idx) + block + html.slice(idx);
      }
      // Fallback to top
      return block + html;
    }

    case 'head-end': {
      const headCloseIdx = html.search(/<\/head>/i);
      if (headCloseIdx !== -1) {
        return html.slice(0, headCloseIdx) + block + html.slice(headCloseIdx);
      }
      // Fallback to bottom
      return html + block;
    }

    case 'body-start': {
      const bodyMatch = html.match(/<body[^>]*>/i);
      if (bodyMatch) {
        const idx = bodyMatch.index + bodyMatch[0].length;
        return html.slice(0, idx) + block + html.slice(idx);
      }
      // Fallback to top
      return block + html;
    }

    case 'body-end': {
      const bodyCloseIdx = html.search(/<\/body>/i);
      if (bodyCloseIdx !== -1) {
        return html.slice(0, bodyCloseIdx) + block + html.slice(bodyCloseIdx);
      }
      // Fallback to bottom
      return html + block;
    }

    default:
      return html;
  }
}
