/**
 * Workspace feature public API
 * Export only what components need to use this feature
 */

// Components
export { WorkspacePage } from './components';

// Hooks
export { useWorkspace, useWorkspaces, useCreateWorkspace } from './hooks';

// Types & API
export type { WorkspaceResponse, CreateWorkspaceInput, UpdateWorkspaceInput } from './api';
export { workspaceKeys } from './api';
