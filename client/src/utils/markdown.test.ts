import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from './markdown.ts';

describe('Client Markdown Engine - Parsing & XSS Prevention', () => {
  it('converts markdown headers and paragraphs', () => {
    const input =
      '# Algorithms\n## Dynamic Programming\nOptimal substructure and overlapping subproblems.';
    const html = renderMarkdown(input);

    assert.ok(html.includes('<h1 class="md-h1">Algorithms</h1>'));
    assert.ok(html.includes('<h2 class="md-h2">Dynamic Programming</h2>'));
    assert.ok(
      html.includes('<p class="md-p">Optimal substructure and overlapping subproblems.</p>')
    );
  });

  it('formats inline bold, italic, and code', () => {
    const input = 'Use **memoization** or *tabulation* with `dp[i]` array.';
    const html = renderMarkdown(input);

    assert.ok(html.includes('<strong>memoization</strong>'));
    assert.ok(html.includes('<em>tabulation</em>'));
    assert.ok(html.includes('<code class="md-inline-code">dp[i]</code>'));
  });

  it('converts unordered and ordered lists', () => {
    const input = '- Item A\n- Item B\n\n1. Step 1\n2. Step 2';
    const html = renderMarkdown(input);

    assert.ok(html.includes('<ul class="md-ul">'));
    assert.ok(html.includes('<li>Item A</li>'));
    assert.ok(html.includes('<li>Item B</li>'));
    assert.ok(html.includes('<ol class="md-ol">'));
    assert.ok(html.includes('<li>Step 1</li>'));
    assert.ok(html.includes('<li>Step 2</li>'));
  });

  it('escapes raw HTML script tags to prevent injection', () => {
    const malicious = '<script>alert("xss")</script>\n<img src=x onerror=alert(1)>';
    const html = renderMarkdown(malicious);

    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('<img'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.ok(html.includes('&lt;img'));
  });

  it('handles fenced code blocks', () => {
    const code = '```typescript\nconst x: number = 42;\nconsole.log(x);\n```';
    const html = renderMarkdown(code);

    assert.ok(
      html.includes(
        '<pre class="md-code-block"><code>const x: number = 42;\nconsole.log(x);</code></pre>'
      )
    );
  });
});
