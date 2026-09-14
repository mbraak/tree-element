// The tree widget without drag and drop, published as "tree-element/core".
// It has the same api as the main entry point, but the `dragAndDrop` option
// does nothing, and the drag and drop code stays out of the bundle. See
// treeElement.ts for how the two entry points are put together.

// The public types; see the comment in treeElement.ts.
export type {
    MoveInfo,
    Node,
    NodeData,
    NodeId,
    Position,
    SavedState,
    SelectNodeOptions,
    TreeElementOptions,
    TreeEvent,
    TreeEventName,
    TreeEvents,
    TriggerEventProvider,
} from "./treeElement";

export { default } from "./treeElement";
