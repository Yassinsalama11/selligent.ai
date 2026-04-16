/**
 * Action registry — maintains a process-level map of defined actions.
 * Allows looking up actions by id for approval workflows and audit queries.
 */
const _registry = new Map();

function register(action) {
  if (_registry.has(action.id)) {
    throw new Error(`Action "${action.id}" is already registered. IDs must be unique.`);
  }
  _registry.set(action.id, action);
  return action;
}

function get(id) {
  return _registry.get(id) || null;
}

function list() {
  return [..._registry.values()].map((a) => ({
    id: a.id,
    requiresApproval: a.definition.requiresApproval || false,
    scopes: a.definition.scopes || [],
  }));
}

module.exports = { register, get, list };
