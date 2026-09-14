import type { DragAndDropHandlerParams } from "./dragAndDropHandler";

import { DragAndDropHandler } from "./dragAndDropHandler";
import TreeElementCore from "./treeElement";

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

/**
 * The tree widget, with drag and drop. This is the main entry point of the
 * package. Import `tree-element/core` instead for the same tree without drag
 * and drop, which leaves that code out of your bundle.
 */
export default class TreeElement extends TreeElementCore {
    protected override createDragAndDropHandler(
        params: DragAndDropHandlerParams,
    ): DragAndDropHandler {
        return new DragAndDropHandler(params);
    }
}
