<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue";

import { getDemoOptions } from "./demos";

const props = withDefaults(
  defineProps<{
    // The name of a demo in demos.ts.
    demo?: string;
    // Show a log of the events the tree dispatches.
    events?: boolean;
    // Show the buttons that call the api.
    api?: boolean;
  }>(),
  { api: false, demo: "basic", events: false },
);

const EVENT_NAMES = [
  "tree.init",
  "tree.click",
  "tree.dblclick",
  "tree.contextmenu",
  "tree.select",
  "tree.deselect",
  "tree.open",
  "tree.close",
  "tree.move",
  "tree.set_data",
  "tree.loading_data",
  "tree.loaded_data",
  "tree.load_failed",
  "tree.refresh",
];

interface LogEntry {
  detail: string;
  key: number;
  name: string;
}

const container = ref<HTMLElement | null>(null);
const entries = ref<LogEntry[]>([]);
const error = ref<null | string>(null);
// The tree is not reactive: it is a widget that owns its own dom.
const tree = shallowRef<null | Record<string, any>>(null);

let nextKey = 0;

const describe = (name: string, detail: unknown): string => {
  if (!detail || typeof detail !== "object") {
    return "";
  }

  const values = detail as Record<string, any>;

  if (name === "tree.move") {
    const info = values.moveInfo;
    return `${info.movedNode.name} → ${info.position} ${info.targetNode.name}`;
  }

  if (name === "tree.select") {
    const deselected = values.deselectedNode;
    return deselected
      ? `node: ${values.node.name}, was: ${deselected.name}`
      : `node: ${values.node.name}`;
  }

  if (name === "tree.loading_data" || name === "tree.loaded_data") {
    return values.node ? values.node.name : "tree";
  }

  if (name === "tree.load_failed") {
    return values.response
      ? `status: ${values.response.status}`
      : `error: ${String(values.error)}`;
  }

  if (name === "tree.set_data") {
    const count = Array.isArray(values.treeData) ? values.treeData.length : 0;
    const target = values.node ? values.node.name : "tree";
    return `${target}: ${count} node(s)`;
  }

  return values.node ? `node: ${values.node.name}` : "";
};

const handleEvent = (event: Event) => {
  const detail = (event as CustomEvent).detail;

  entries.value = [
    { detail: describe(event.type, detail), key: nextKey++, name: event.type },
    ...entries.value,
  ].slice(0, 8);
};

const selectedName = () => {
  const node = tree.value?.getSelectedNode();
  return node ? node.name : null;
};

const addNode = () => {
  const parent = tree.value?.getSelectedNode();

  if (!parent) {
    error.value = "Select a node first.";
    return;
  }

  error.value = null;
  const node = tree.value?.appendNode(
    { name: `new node ${nextKey++}` },
    parent,
  );
  tree.value?.openNode(parent);
  tree.value?.selectNode(node);
};

const removeSelectedNode = () => {
  const node = tree.value?.getSelectedNode();

  if (!node) {
    error.value = "Select a node first.";
    return;
  }

  error.value = null;
  tree.value?.removeNode(node);
};

const renameSelectedNode = () => {
  const node = tree.value?.getSelectedNode();

  if (!node) {
    error.value = "Select a node first.";
    return;
  }

  error.value = null;
  tree.value?.updateNode(node, `${node.name} (renamed)`);
};

const openAll = () => {
  tree.value?.getTree().iterate((node: Record<string, any>) => {
    if (node.hasChildren()) {
      tree.value?.openNode(node, false);
    }
    return true;
  });
};

const closeAll = () => {
  tree.value?.getTree().iterate((node: Record<string, any>) => {
    if (node.hasChildren()) {
      tree.value?.closeNode(node, false);
    }
    return true;
  });
};

onMounted(async () => {
  const element = container.value;

  if (!element) {
    return;
  }

  // Imported here, and not at the top of the file, because the tree needs a dom:
  // this component is also rendered on the server when the site is built.
  const { default: TreeElement } = await import("../../../src/index");

  if (props.events) {
    for (const name of EVENT_NAMES) {
      element.addEventListener(name, handleEvent);
    }
  }

  try {
    tree.value = new TreeElement({
      htmlElement: element,
      ...getDemoOptions(props.demo),
    }) as unknown as Record<string, any>;
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
});

onBeforeUnmount(() => {
  const element = container.value;

  if (element && props.events) {
    for (const name of EVENT_NAMES) {
      element.removeEventListener(name, handleEvent);
    }
  }

  tree.value?.deinit();
  tree.value = null;
});
</script>

<template>
  <div class="tree-demo">
    <div v-if="api" class="tree-demo-toolbar">
      <button type="button" @click="addNode">Add child</button>
      <button type="button" @click="renameSelectedNode">Rename</button>
      <button type="button" @click="removeSelectedNode">Remove</button>
      <button type="button" @click="openAll">Open all</button>
      <button type="button" @click="closeAll">Close all</button>
    </div>

    <div ref="container" class="tree-demo-tree" />

    <p v-if="error" class="tree-demo-error">{{ error }}</p>

    <div v-if="events" class="tree-demo-log">
      <div class="tree-demo-log-header">
        <span>Events</span>
        <button type="button" @click="entries = []">Clear</button>
      </div>
      <ol v-if="entries.length" class="tree-demo-log-entries">
        <li v-for="entry of entries" :key="entry.key">
          <code>{{ entry.name }}</code>
          <span v-if="entry.detail">{{ entry.detail }}</span>
        </li>
      </ol>
      <p v-else class="tree-demo-log-empty">
        Click a node, open a folder, or drag something.
      </p>
    </div>
  </div>
</template>
