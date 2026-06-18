import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExitButton } from '../ExitButton';

describe('ExitButton', () => {
  it('links back to the hub', () => {
    const html = renderToStaticMarkup(<ExitButton ariaLabel="返回游戏大厅" />);

    expect(html).toContain('href="/"');
    expect(html).toContain('aria-label="返回游戏大厅"');
  });
});
