import fs from 'node:fs';

const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const wrapper = fs.readFileSync(new URL('../src/pages/InventoryPoliciesPage.jsx', import.meta.url), 'utf8');
const config = fs.readFileSync(new URL('../src/pages/ConfigurationPage.jsx', import.meta.url), 'utf8');

const requireText = (source, value, message) => {
  if (!source.includes(value)) throw new Error(message || `Missing required contract: ${value}`);
};

requireText(app, 'path="inventory" element={<InventoryPoliciesPage />}', 'Inventory Policies must use the dedicated V1 workspace.');
requireText(wrapper, '<ConfigurationPage kind="inventory" />', 'Inventory Policies must reuse the existing effective-configuration editor.');
requireText(wrapper, 'System → Business → Store → POS', 'Inventory policy hierarchy must remain explicit.');
requireText(wrapper, 'do not directly change product stock, batches, purchases, returns, or audited stock-adjustment facts', 'Policy UI must not imply direct inventory mutation authority.');
requireText(wrapper, 'Overrides remain explicit and resettable', 'Scoped policy overrides must preserve reset-to-inherit behavior.');
requireText(config, 'api.configurationCatalog()', 'Policies must come from the Central configuration catalog.');
requireText(config, 'api.scopeConfiguration(scopeType, scopeId)', 'Policies must read scoped Central configuration.');
requireText(config, 'api.updateScopeConfiguration(scopeType, scopeId, values)', 'Policies must write through the canonical scoped configuration API.');
requireText(config, 'api.resetScopeConfiguration(scopeType, scopeId, meta.key)', 'Policies must support safe reset-to-inherit.');
requireText(config, "inventory: { title: 'Inventory Policies'", 'Configuration catalog filtering must retain the inventory group.');

if (wrapper.includes('localStorage') || wrapper.includes('indexedDB') || wrapper.includes('posApi')) {
  throw new Error('Inventory policy management must not use browser/POS-local authority.');
}

console.log('RetailHub Inventory Policies acceptance passed.');
