import fs from 'node:fs';
import path from 'node:path';

describe('AppTabs route declarations', () => {
  test('orders tabs around the center Go action without a profile tab', () => {
    const source = fs.readFileSync(path.join(__dirname, '../app-tabs.tsx'), 'utf8');

    expect(tabRouteNames(source)).toEqual(['index', 'countries', 'go', 'collections', 'trips']);
    expect(source).toContain('<NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>');
    expect(source).toContain('<NativeTabs.Trigger.Label>Countries</NativeTabs.Trigger.Label>');
    expect(source).toContain('Go!');
    expect(source).toContain('<NativeTabs.Trigger.Label>Collections</NativeTabs.Trigger.Label>');
    expect(source).toContain('<NativeTabs.Trigger.Label>Trips</NativeTabs.Trigger.Label>');
    expect(source).not.toContain('name="profile"');
  });
});

function tabRouteNames(source: string) {
  return Array.from(source.matchAll(/<NativeTabs\.Trigger name="([^"]+)"/g), (match) => match[1]);
}
