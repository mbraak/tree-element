import type { TreeEventName, TreeEvents } from "./events";
import type { Node, NodeData, NodeId } from "./node";
import type NodeElement from "./nodeElement";

export type AddToSelection = (node: Node) => void;

export type CloseNode = (node: Node) => Promise<void>;

export type GetNodeById = (nodeId: NodeId) => Node | null;

export type GetNodeElementForNode = (node: Node) => NodeElement;

export type GetScrollLeft = () => number;

export type GetSelectedNode = () => Node | null;

export type GetSelectedNodes = () => Node[];

export type GetTree = () => Node | null;

export type IsFocusOnTree = () => boolean;

export type IsNodeSelected = (node: Node) => boolean;

export type LoadData = (data: NodeData[], parentNode?: Node) => void;

export type OpenNode = (node: Node, slide?: boolean) => Promise<void>;

export type OpenParents = (node: Node) => void;

export type RefreshElements = (fromNode: Node | null) => void;

export type RemoveFromSelection = (node: Node) => void;

export type SelectNode = (node: Node) => void;

// Trigger an event. Return if the event is processed (true) or cancelled (false).
export type TriggerEvent = <Name extends TreeEventName>(
  eventName: Name,
  values?: TreeEvents[Name],
) => boolean;
