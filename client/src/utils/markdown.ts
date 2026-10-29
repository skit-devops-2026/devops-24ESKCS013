import DOMPurify from 'dompurify';

/**
 * Escapes HTML entities to prevent raw injection before formatting.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses markdown text to sanitized HTML.
 * Supports:
 * - Headers (# H1, ## H2, ### H3, #### H4)
 * - Bold (**text**), Italic (*text*), Strikethrough (~~text~~)
 * - Inline code (`code`)
 * - Code blocks (```lang ... ```)
 * - Blockquotes (> quote)
 * - Unordered lists (- item, * item)
 * - Ordered lists (1. item)
 * - Hyperlinks ([text](url)) with safe protocol enforcement
 * - Horizontal rules (---)
 * - Paragraph breaks
 */
export function renderMarkdown(rawMarkdown: string): string {
  if (!rawMarkdown || !rawMarkdown.trim()) return '';

  const lines = rawMarkdown.split('\n');
  const output: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let inList: 'ul' | 'ol' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        output.push(
          `<pre class="md-code-block"><code>${escapeHtml(codeBlockLines.join('\n'))}</code></pre>`
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        if (inList) {
          output.push(inList === 'ul' ? '</ul>' : '</ol>');
          inList = null;
        }
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Horizontal Rule
    if (/^(---|___|\*\*\*)$/.test(line.trim())) {
      if (inList) {
        output.push(inList === 'ul' ? '</ul>' : '</ol>');
        inList = null;
      }
      output.push('<hr class="md-hr" />');
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      if (inList) {
        output.push(inList === 'ul' ? '</ul>' : '</ol>');
        inList = null;
      }
      const level = headerMatch[1].length;
      const content = parseInline(escapeHtml(headerMatch[2]));
      output.push(`<h${level} class="md-h${level}">${content}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      if (inList) {
        output.push(inList === 'ul' ? '</ul>' : '</ol>');
        inList = null;
      }
      const quoteText = parseInline(escapeHtml(line.trim().substring(1).trim()));
      output.push(`<blockquote class="md-quote">${quoteText}</blockquote>`);
      continue;
    }

    // Unordered list (- or * )
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (ulMatch) {
      if (inList !== 'ul') {
        if (inList === 'ol') output.push('</ol>');
        output.push('<ul class="md-ul">');
        inList = 'ul';
      }
      output.push(`<li>${parseInline(escapeHtml(ulMatch[2]))}</li>`);
      continue;
    }

    // Ordered list (1. 2. etc)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inList !== 'ol') {
        if (inList === 'ul') output.push('</ul>');
        output.push('<ol class="md-ol">');
        inList = 'ol';
      }
      output.push(`<li>${parseInline(escapeHtml(olMatch[2]))}</li>`);
      continue;
    }

    // If it's an empty line, close any open list
    if (!line.trim()) {
      if (inList) {
        output.push(inList === 'ul' ? '</ul>' : '</ol>');
        inList = null;
      }
      continue;
    }

    // Normal paragraph line
    if (inList) {
      output.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }

    output.push(`<p class="md-p">${parseInline(escapeHtml(line))}</p>`);
  }

  // Clean up hanging blocks
  if (inCodeBlock) {
    output.push(
      `<pre class="md-code-block"><code>${escapeHtml(codeBlockLines.join('\n'))}</code></pre>`
    );
  }
  if (inList) {
    output.push(inList === 'ul' ? '</ul>' : '</ol>');
  }

  const rawHtml = output.join('');

  // Sanitize with DOMPurify against XSS
  if (typeof window !== 'undefined' && DOMPurify.sanitize) {
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1',
        'h2',
        'h3',
        'h4',
        'p',
        'b',
        'strong',
        'i',
        'em',
        's',
        'del',
        'code',
        'pre',
        'blockquote',
        'ul',
        'ol',
        'li',
        'hr',
        'a',
        'span',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    });
  }

  return rawHtml;
}

/**
 * Parses inline elements: bold, italic, strikethrough, inline code, and links.
 */
function parseInline(text: string): string {
  return (
    text
      // Inline code: `code`
      .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
      // Bold: **text**
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic: *text*
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Strikethrough: ~~text~~
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      // Links: [title](url) - only http, https, mailto allowed
      .replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
      )
  );
}
