/*
Tree-element 0.1.1

Copyright 2026 Marco Braak

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
@license

*/
var TreeElement = (function () {
    'use strict';

    const DEFAULT_CLASS_PREFIX = "tree-element";

    /* Create the class names that the widget puts on the elements it creates.
     * They are all derived from classPrefix, except for the class of the root
     * element and the class that every element gets, which have an option of
     * their own.
     */
    const createClassNames = ({
      classPrefix,
      commonClassName,
      treeClassName
    }) => ({
      border: `${classPrefix}-border`,
      circle: `${classPrefix}-circle`,
      closed: `${classPrefix}-closed`,
      common: commonClassName ?? `${classPrefix}-common`,
      dnd: `${classPrefix}-dnd`,
      dragging: `${classPrefix}-dragging`,
      element: `${classPrefix}-element`,
      folder: `${classPrefix}-folder`,
      ghost: `${classPrefix}-ghost`,
      inside: `${classPrefix}-inside`,
      line: `${classPrefix}-line`,
      loading: `${classPrefix}-loading`,
      moving: `${classPrefix}-moving`,
      rtl: `${classPrefix}-rtl`,
      selected: `${classPrefix}-selected`,
      title: `${classPrefix}-title`,
      titleButtonLeft: `${classPrefix}-title-button-left`,
      titleButtonRight: `${classPrefix}-title-button-right`,
      titleFolder: `${classPrefix}-title-folder`,
      toggler: `${classPrefix}-toggler`,
      togglerLeft: `${classPrefix}-toggler-left`,
      togglerRight: `${classPrefix}-toggler-right`,
      tree: treeClassName ?? classPrefix
    });

    class DataLoader {
      _abortController;
      _classNames;
      _dataFilter;
      _loadData;
      _treeElement;
      _triggerEvent;
      constructor({
        _classNames: classNames,
        _dataFilter: dataFilter,
        _loadData: loadData,
        _treeElement: treeElement,
        _triggerEvent: triggerEvent
      }) {
        this._abortController = new AbortController();
        this._classNames = classNames;
        this._dataFilter = dataFilter;
        this._loadData = loadData;
        this._treeElement = treeElement;
        this._triggerEvent = triggerEvent;
      }
      _deinit() {
        this._abortController.abort();
      }
      async _loadFromUrl(url, node) {
        const element = node?.element ?? this._treeElement;
        element.classList.add(this._classNames.loading);
        this._triggerEvent("tree.loading_data", {
          element,
          node
        });
        const stopLoading = () => {
          element.classList.remove(this._classNames.loading);
          this._triggerEvent("tree.loaded_data", {
            element,
            node
          });
        };
        const handleResponse = async response => {
          if (response.ok) {
            const data = await response.json();
            stopLoading();
            this._loadData(this._dataFilter ? this._dataFilter(data) : data, node);
          } else {
            stopLoading();
            this._triggerEvent("tree.load_failed", {
              response
            });
          }
        };
        const signal = this._abortController.signal;
        url._setSearchParam("_", Date.now().toString());
        return fetch(url._value(), {
          headers: {
            "Content-Type": "application/json"
          },
          signal
        }).then(handleResponse).catch(error => {
          if (this._abortController.signal.aborted) {
            // The request was aborted by deinit.
            return;
          }
          stopLoading();
          this._triggerEvent("tree.load_failed", {
            error
          });
        });
      }
    }

    // Get the top position of the HTML element.
    const getOffsetTop = element => getElementPosition(element).top;

    // Get the top left position of the HTML element.
    const getElementPosition = element => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.x + window.scrollX,
        top: rect.y + window.scrollY
      };
    };

    function binarySearch(items, compareFn) {
      let low = 0;
      let high = items.length;
      while (low < high) {
        const mid = low + high >> 1;
        const item = items[mid];
        if (item === undefined) {
          return null;
        }
        const compareResult = compareFn(item);
        if (compareResult > 0) {
          high = mid;
        } else if (compareResult < 0) {
          low = mid + 1;
        } else {
          return item;
        }
      }
      return null;
    }

    class DragElement {
      _element;
      _offsetX;
      _offsetY;
      constructor({
        _autoEscape: autoEscape,
        _classNames: classNames,
        _nodeName: nodeName,
        _offsetX: offsetX,
        _offsetY: offsetY,
        _treeElement: treeElement
      }) {
        this._offsetX = offsetX;
        this._offsetY = offsetY;
        this._element = this._createElement(nodeName, autoEscape, classNames);
        treeElement.appendChild(this._element);
      }
      _move(pageX, pageY) {
        this._element.style.left = `${pageX - this._offsetX}px`;
        this._element.style.top = `${pageY - this._offsetY}px`;
      }
      _remove() {
        this._element.remove();
      }
      _createElement(nodeName, autoEscape, classNames) {
        const element = document.createElement("span");
        element.classList.add(classNames.title, classNames.dragging);
        if (autoEscape) {
          element.textContent = nodeName;
        } else {
          element.innerHTML = nodeName;
        }
        element.style.position = "absolute";
        return element;
      }
    }

    const iterateVisibleNodes = (tree, {
      _handleAfterOpenFolder: handleAfterOpenFolder,
      _handleClosedFolder: handleClosedFolder,
      _handleFirstNode: handleFirstNode,
      _handleNode: handleNode,
      _handleOpenFolder: handleOpenFolder
    }) => {
      let isFirstNode = true;
      const iterate = (node, nextNode) => {
        let mustIterateInside = (node.is_open === true || !node.element) && node.hasChildren();
        let element = null;

        // Is the element visible?
        if (node.element?.offsetParent) {
          element = node.element;
          if (isFirstNode) {
            handleFirstNode(node);
            isFirstNode = false;
          }
          if (!node.hasChildren()) {
            handleNode(node, nextNode, node.element);
          } else if (node.is_open) {
            if (!handleOpenFolder(node, node.element)) {
              mustIterateInside = false;
            }
          } else {
            handleClosedFolder(node, nextNode, element);
          }
        }
        if (mustIterateInside) {
          const childrenLength = node.children.length;
          node.children.forEach((_, i) => {
            const child = node.children[i];
            if (child) {
              if (i === childrenLength - 1) {
                iterate(child, null);
              } else {
                const nextChild = node.children[i + 1];
                if (nextChild) {
                  iterate(child, nextChild);
                }
              }
            }
          });
          if (node.is_open && element) {
            handleAfterOpenFolder(node, nextNode);
          }
        }
      };
      iterate(tree, null);
    };

    const generateHitPositions = (tree, currentNode) => {
      const hitPositions = [];
      let lastTop = 0;
      const addHitPosition = (node, position, top) => {
        hitPositions.push({
          node,
          position,
          top
        });
        lastTop = top;
      };
      const handleAfterOpenFolder = (node, nextNode) => {
        if (node === currentNode || nextNode === currentNode) {
          // Cannot move before or after current item
          addHitPosition(node, null, lastTop);
        } else {
          addHitPosition(node, "after", lastTop);
        }
      };
      const handleClosedFolder = (node, nextNode, element) => {
        const top = getOffsetTop(element);
        if (node === currentNode) {
          // Cannot move after current item
          addHitPosition(node, null, top);
        } else {
          addHitPosition(node, "inside", top);

          // Cannot move before current item
          if (nextNode !== currentNode) {
            addHitPosition(node, "after", top);
          }
        }
      };
      const handleFirstNode = node => {
        if (node !== currentNode && node.element) {
          addHitPosition(node, "before", getOffsetTop(node.element));
        }
      };
      const handleNode = (node, nextNode, element) => {
        const top = getOffsetTop(element);
        if (node === currentNode) {
          // Cannot move inside current item
          addHitPosition(node, null, top);
        } else {
          addHitPosition(node, "inside", top);
        }
        if (nextNode === currentNode || node === currentNode) {
          // Cannot move before or after current item
          addHitPosition(node, null, top);
        } else {
          addHitPosition(node, "after", top);
        }
      };
      const handleOpenFolder = (node, element) => {
        if (node === currentNode) {
          // Cannot move inside current item

          // Dnd over the current element is not possible: add a position with type None for the top and the bottom.
          const top = getOffsetTop(element);
          const height = element.clientHeight;
          addHitPosition(node, null, top);
          if (height > 5) {
            // Subtract 5 pixels to allow more space for the next element.
            addHitPosition(node, null, top + height - 5);
          }

          // Stop iterating
          return false;
        }

        // Cannot move before current item
        if (node.children[0] !== currentNode) {
          addHitPosition(node, "inside", getOffsetTop(element));
        }

        // Continue iterating
        return true;
      };
      iterateVisibleNodes(tree, {
        _handleAfterOpenFolder: handleAfterOpenFolder,
        _handleClosedFolder: handleClosedFolder,
        _handleFirstNode: handleFirstNode,
        _handleNode: handleNode,
        _handleOpenFolder: handleOpenFolder
      });
      return hitPositions;
    };
    const generateHitAreasForGroup = (hitAreas, positionsInGroup, top, bottom) => {
      // limit positions in group
      const positionCount = Math.min(positionsInGroup.length, 4);
      const areaHeight = Math.round((bottom - top) / positionCount);
      let areaTop = top;
      for (let i = 0; i < positionCount; i++) {
        const position = positionsInGroup[i];
        if (position.position) {
          hitAreas.push({
            bottom: areaTop + areaHeight,
            node: position.node,
            position: position.position,
            top: areaTop
          });
        }
        areaTop += areaHeight;
      }
    };
    const generateHitAreasFromPositions = (hitPositions, treeBottom) => {
      if (!hitPositions.length) {
        return [];
      }
      let previousTop = hitPositions[0].top;
      let group = [];
      const hitAreas = [];
      for (const position of hitPositions) {
        if (position.top !== previousTop && group.length) {
          generateHitAreasForGroup(hitAreas, group, previousTop, position.top);
          previousTop = position.top;
          group = [];
        }
        group.push(position);
      }
      generateHitAreasForGroup(hitAreas, group, previousTop, treeBottom);
      return hitAreas;
    };
    const generateHitAreas = (tree, currentNode, treeBottom) => generateHitAreasFromPositions(generateHitPositions(tree, currentNode), treeBottom);

    class DragAndDropHandler {
      _currentItem;
      _hitAreas;
      _hoveredArea;
      _isDragging;
      _autoEscape;
      _classNames;
      _dragElement;
      _getNodeElement;
      _getNodeElementForNode;
      _getScrollLeft;
      _getTree;
      _onCanMove;
      _onCanMoveTo;
      _onDragMove;
      _onDragStop;
      _onIsMoveHandle;
      _openFolderDelay;
      _openFolderTimer;
      _openNode;
      _previousGhost;
      _refreshElements;
      _slide;
      _treeElement;
      _triggerEvent;
      constructor({
        _autoEscape: autoEscape,
        _classNames: classNames,
        _getNodeElement: getNodeElement,
        _getNodeElementForNode: getNodeElementForNode,
        _getScrollLeft: getScrollLeft,
        _getTree: getTree,
        _onCanMove: onCanMove,
        _onCanMoveTo: onCanMoveTo,
        _onDragMove: onDragMove,
        _onDragStop: onDragStop,
        _onIsMoveHandle: onIsMoveHandle,
        _openFolderDelay: openFolderDelay,
        _openNode: openNode,
        _refreshElements: refreshElements,
        _slide: slide,
        _treeElement: treeElement,
        _triggerEvent: triggerEvent
      }) {
        this._autoEscape = autoEscape;
        this._classNames = classNames;
        this._getNodeElement = getNodeElement;
        this._getNodeElementForNode = getNodeElementForNode;
        this._getScrollLeft = getScrollLeft;
        this._getTree = getTree;
        this._onCanMove = onCanMove;
        this._onCanMoveTo = onCanMoveTo;
        this._onDragMove = onDragMove;
        this._onDragStop = onDragStop;
        this._onIsMoveHandle = onIsMoveHandle;
        this._openFolderDelay = openFolderDelay;
        this._openNode = openNode;
        this._refreshElements = refreshElements;
        this._slide = slide;
        this._treeElement = treeElement;
        this._triggerEvent = triggerEvent;
        this._hoveredArea = null;
        this._hitAreas = [];
        this._isDragging = false;
        this._currentItem = null;
        this._dragElement = null;
        this._openFolderTimer = null;
        this._previousGhost = null;
      }
      _mouseCapture(positionInfo) {
        const element = positionInfo.target;
        if (!this._mustCaptureElement(element)) {
          return null;
        }
        if (this._onIsMoveHandle && !this._onIsMoveHandle(element)) {
          return null;
        }
        let nodeElement = this._getNodeElement(element);
        if (nodeElement && this._onCanMove) {
          if (!this._onCanMove(nodeElement._node)) {
            nodeElement = null;
          }
        }
        this._currentItem = nodeElement;
        return this._currentItem != null;
      }
      _mouseDrag(positionInfo) {
        if (!this._currentItem || !this._dragElement) {
          return false;
        }
        this._dragElement._move(positionInfo.pageX, positionInfo.pageY);
        const area = this._findHoveredArea(positionInfo.pageX, positionInfo.pageY);
        if (area && this._canMoveToArea(area, this._currentItem)) {
          if (!area.node.isFolder()) {
            this._stopOpenFolderTimer();
          }
          if (this._hoveredArea !== area) {
            this._hoveredArea = area;

            // If this is a closed folder, start timer to open it
            if (this._mustOpenFolderTimer(area)) {
              this._startOpenFolderTimer(area.node);
            } else {
              this._stopOpenFolderTimer();
            }
            this._updateDropHint();
          }
        } else {
          this._removeDropHint();
          this._stopOpenFolderTimer();
          this._hoveredArea = area;
        }
        if (!area) {
          if (this._onDragMove) {
            this._onDragMove(this._currentItem._node, positionInfo.originalEvent);
          }
        }
        return true;
      }
      _mouseStart(positionInfo) {
        if (!this._currentItem) {
          return false;
        }
        this._refresh();
        const {
          left,
          top
        } = getElementPosition(positionInfo.target);
        const node = this._currentItem._node;
        this._dragElement = new DragElement({
          _autoEscape: this._autoEscape ?? true,
          _classNames: this._classNames,
          _nodeName: node.name,
          _offsetX: positionInfo.pageX - left,
          _offsetY: positionInfo.pageY - top,
          _treeElement: this._treeElement
        });
        this._isDragging = true;
        this._currentItem._element.classList.add(this._classNames.moving);
        return true;
      }
      _mouseStop(positionInfo) {
        this._moveItem(positionInfo);
        this._clear();
        this._removeHover();
        this._removeDropHint();
        this._removeHitAreas();
        const currentItem = this._currentItem;
        if (this._currentItem) {
          this._currentItem._element.classList.remove(this._classNames.moving);
          this._currentItem = null;
        }
        this._isDragging = false;
        if (!this._hoveredArea && currentItem) {
          if (this._onDragStop) {
            this._onDragStop(currentItem._node, positionInfo.originalEvent);
          }
        }
        return false;
      }
      _refresh() {
        this._removeHitAreas();
        if (this._currentItem) {
          const currentNode = this._currentItem._node;
          this._generateHitAreas(currentNode);
          this._currentItem = this._getNodeElementForNode(currentNode);
          if (this._isDragging) {
            this._currentItem._element.classList.add(this._classNames.moving);
          }
        }
      }
      _canMoveToArea(area, currentItem) {
        if (!this._onCanMoveTo) {
          return true;
        }
        return this._onCanMoveTo(currentItem._node, area.node, area.position);
      }
      _clear() {
        if (this._dragElement) {
          this._dragElement._remove();
          this._dragElement = null;
        }
      }
      _findHoveredArea(x, y) {
        const dimensions = this._getTreeDimensions();
        if (x < dimensions.left || y < dimensions.top || x > dimensions.right || y > dimensions.bottom) {
          return null;
        }
        return binarySearch(this._hitAreas, area => {
          if (y < area.top) {
            return 1;
          } else if (y > area.bottom) {
            return -1;
          } else {
            return 0;
          }
        });
      }
      _generateHitAreas(currentNode) {
        const tree = this._getTree();
        if (!tree) {
          this._hitAreas = [];
        } else {
          this._hitAreas = generateHitAreas(tree, currentNode, this._getTreeDimensions().bottom);
        }
      }
      _getTreeDimensions() {
        // Return the dimensions of the tree. Add a margin to the bottom to allow
        // to drag-and-drop after the last element.
        const treePosition = getElementPosition(this._treeElement);
        const left = treePosition.left + this._getScrollLeft();
        const top = treePosition.top;
        return {
          bottom: top + this._treeElement.clientHeight + 16,
          left,
          right: left + this._treeElement.clientWidth,
          top
        };
      }

      /* Move the dragged node to the selected position in the tree. */
      _moveItem(positionInfo) {
        if (this._currentItem && this._hoveredArea?.position && this._canMoveToArea(this._hoveredArea, this._currentItem)) {
          const movedNode = this._currentItem._node;
          const targetNode = this._hoveredArea.node;
          const position = this._hoveredArea.position;
          const previousParent = movedNode.parent;
          if (position === "inside") {
            this._hoveredArea.node.is_open = true;
          }
          const doMove = () => {
            const tree = this._getTree();
            if (tree) {
              tree.moveNode(movedNode, targetNode, position);
              this._treeElement.textContent = "";
              this._refreshElements(null);
            }
          };
          if (this._triggerEvent("tree.move", {
            moveInfo: {
              doMove,
              movedNode,
              originalEvent: positionInfo.originalEvent,
              position,
              previousParent,
              targetNode
            }
          })) {
            doMove();
          }
        }
      }
      _mustCaptureElement(element) {
        const nodeName = element.nodeName;
        return nodeName !== "INPUT" && nodeName !== "SELECT" && nodeName !== "TEXTAREA";
      }
      _mustOpenFolderTimer(area) {
        const node = area.node;
        return node.isFolder() && !node.is_open && area.position === "inside";
      }
      _removeDropHint() {
        if (this._previousGhost) {
          this._previousGhost.remove();
        }
      }
      _removeHitAreas() {
        this._hitAreas = [];
      }
      _removeHover() {
        this._hoveredArea = null;
      }
      _startOpenFolderTimer(folder) {
        const openFolder = () => {
          void this._openNode(folder, this._slide).then(() => {
            this._refresh();
            this._updateDropHint();
          });
        };
        this._stopOpenFolderTimer();
        const openFolderDelay = this._openFolderDelay;
        if (openFolderDelay !== false) {
          this._openFolderTimer = window.setTimeout(openFolder, openFolderDelay);
        }
      }
      _stopOpenFolderTimer() {
        if (this._openFolderTimer) {
          clearTimeout(this._openFolderTimer);
          this._openFolderTimer = null;
        }
      }
      _updateDropHint() {
        if (!this._hoveredArea) {
          return;
        }

        // remove previous drop hint
        this._removeDropHint();

        // add new drop hint
        const nodeElement = this._getNodeElementForNode(this._hoveredArea.node);
        this._previousGhost = nodeElement._addDropHint(this._hoveredArea.position);
      }
    }

    const isInt = n => typeof n === "number" && n % 1 === 0;
    const getBoolString = value => value ? "true" : "false";

    /* Renders the tree to html.
     *
     * The children of a closed folder are not rendered. They are rendered when
     * the folder is opened, see renderChildren.
     *
     * The elements are created by cloning templates. A template is a fully
     * built <li> or <ul> with everything that is the same for every node
     * (structure, roles, static classes, the toggler icon). Per node only the
     * parts that differ are set: the title, the aria attributes and the
     * selected and loading classes.
     */
    class ElementsRenderer {
      _closedIconElement;
      _openedIconElement;
      _autoEscape;
      _buttonLeft;
      _classNames;
      _closedFolderTemplate;
      _dragAndDrop;
      _getTree;
      _groupUlTemplate;
      _htmlElement;
      _isNodeSelected;
      _nodeTemplate;
      _onCreateLi;
      _openedFolderTemplate;
      _rootUlTemplate;
      _rtl;
      _setNodeElement;
      _showEmptyFolder;
      _tabIndex;
      constructor({
        _autoEscape: autoEscape,
        _buttonLeft: buttonLeft,
        _classNames: classNames,
        _closedIcon: closedIcon,
        _dragAndDrop: dragAndDrop,
        _getTree: getTree,
        _htmlElement: htmlElement,
        _isNodeSelected: isNodeSelected,
        _onCreateLi: onCreateLi,
        _openedIcon: openedIcon,
        _rtl: rtl,
        _setNodeElement: setNodeElement,
        _showEmptyFolder: showEmptyFolder,
        _tabIndex: tabIndex
      }) {
        this._autoEscape = autoEscape;
        this._buttonLeft = buttonLeft;
        this._classNames = classNames;
        this._dragAndDrop = dragAndDrop;
        this._getTree = getTree;
        this._htmlElement = htmlElement;
        this._isNodeSelected = isNodeSelected;
        this._onCreateLi = onCreateLi;
        this._rtl = rtl;
        this._setNodeElement = setNodeElement;
        this._showEmptyFolder = showEmptyFolder;
        this._tabIndex = tabIndex;
        this._openedIconElement = this._createButtonElement(openedIcon ?? "+");
        this._closedIconElement = this._createButtonElement(closedIcon ?? "-");
        this._rootUlTemplate = this._createUlTemplate(true);
        this._groupUlTemplate = this._createUlTemplate(false);
        this._nodeTemplate = this._createNodeTemplate();
        this._openedFolderTemplate = this._createFolderTemplate(true);
        this._closedFolderTemplate = this._createFolderTemplate(false);
      }
      _render(fromNode) {
        if (fromNode?.parent) {
          this._renderFromNode(fromNode);
        } else {
          this._renderFromRoot();
        }
      }

      /* Render the children of a rendered folder. Returns the new <ul>, or
       * null when the folder is not rendered or has no children.
       */
      _renderChildren(node) {
        if (!node.element || !node.hasChildren()) {
          return null;
        }
        return this._createDomElements(node.element, node.children, false, node.getLevel() + 1);
      }
      _renderFromNode(node) {
        if (!node.element) {
          return;
        }
        const currentLi = node.element;
        const newLi = this._createLi(node, node.getLevel());
        currentLi.replaceWith(newLi);
        if (this._mustRenderChildren(node)) {
          this._createDomElements(newLi, node.children, false, node.getLevel() + 1);
        }
      }
      _renderFromRoot() {
        this._htmlElement.textContent = "";
        const tree = this._getTree();
        if (tree) {
          this._createDomElements(this._htmlElement, tree.children, true, 1);
        }
      }
      _attachNodeData(node, li) {
        node.element = li;
        this._setNodeElement(li, node);
      }
      _createButtonElement(value) {
        if (typeof value === "string") {
          // convert value to html
          const div = document.createElement("div");
          div.innerHTML = value;
          return document.createTextNode(div.innerHTML);
        } else if (value.nodeType) {
          return value;
        } else {
          return undefined;
        }
      }
      _createDomElements(element, children, isRootNode, level) {
        const template = isRootNode ? this._rootUlTemplate : this._groupUlTemplate;
        const ul = template.cloneNode();
        element.appendChild(ul);
        for (const child of children) {
          const li = this._createLi(child, level);
          ul.appendChild(li);
          if (this._mustRenderChildren(child)) {
            this._createDomElements(li, child.children, false, level + 1);
          }
        }
        return ul;
      }
      _createFolderLi(node, level, isSelected) {
        const template = node.is_open ? this._openedFolderTemplate : this._closedFolderTemplate;
        const li = template.cloneNode(true);
        if (isSelected) {
          li.classList.add(this._classNames.selected);
        }
        if (node.is_loading) {
          li.classList.add(this._classNames.loading);
        }

        // li > div > [button link], title span, [button link]
        const div = li.firstChild;
        const titleSpan = div.childNodes[this._buttonLeft ? 1 : 0];
        this._fillTitleSpan(titleSpan, node.name, isSelected, level);
        return li;
      }

      /* Template for a folder <li>:
       *   li > div > [button link], title span, [button link]
       * The toggler icon and the aria-expanded attribute depend on the open
       * state, so there is a template for each.
       */
      _createFolderTemplate(isOpen) {
        const liClasses = [this._classNames.common, this._classNames.folder];
        if (!isOpen) {
          liClasses.push(this._classNames.closed);
        }
        const li = this._createLiTemplate(liClasses.join(" "));
        const div = li.firstChild;

        // button link
        const buttonLink = document.createElement("a");
        buttonLink.className = this._getButtonClasses(isOpen);
        const iconElement = isOpen ? this._openedIconElement : this._closedIconElement;
        if (iconElement) {
          buttonLink.appendChild(iconElement.cloneNode(true));
        }
        if (this._buttonLeft) {
          div.appendChild(buttonLink);
        }

        // title span
        const titleSpan = this._createTitleSpanTemplate(true);
        titleSpan.setAttribute("aria-expanded", getBoolString(isOpen));
        div.appendChild(titleSpan);
        if (!this._buttonLeft) {
          div.appendChild(buttonLink);
        }
        return li;
      }

      /* Create the <li> element
       * Attach it to node.element.
       * Call onCreateLi
       */
      _createLi(node, level) {
        const isSelected = this._isNodeSelected(node);
        const mustShowFolder = node.isFolder() || node.isEmptyFolder && this._showEmptyFolder;
        const li = mustShowFolder ? this._createFolderLi(node, level, isSelected) : this._createNodeLi(node, level, isSelected);
        this._attachNodeData(node, li);
        if (this._onCreateLi) {
          this._onCreateLi(node, li, isSelected);
        }
        return li;
      }

      /* Create the outer part of a <li> template: li > div */
      _createLiTemplate(liClasses) {
        const li = document.createElement("li");
        li.className = liClasses;
        li.setAttribute("role", "none");
        const div = document.createElement("div");
        div.className = `${this._classNames.element} ${this._classNames.common}`;
        div.setAttribute("role", "none");
        li.appendChild(div);
        return li;
      }
      _createNodeLi(node, level, isSelected) {
        const li = this._nodeTemplate.cloneNode(true);
        if (isSelected) {
          li.classList.add(this._classNames.selected);
        }

        // li > div > title span
        const div = li.firstChild;
        const titleSpan = div.firstChild;
        this._fillTitleSpan(titleSpan, node.name, isSelected, level);
        return li;
      }

      /* Template for a <li> without children: li > div > title span */
      _createNodeTemplate() {
        const li = this._createLiTemplate(this._classNames.common);
        const div = li.firstChild;
        div.appendChild(this._createTitleSpanTemplate(false));
        return li;
      }
      _createTitleSpanTemplate(isFolder) {
        const titleSpan = document.createElement("span");
        let classes = `${this._classNames.title} ${this._classNames.common}`;
        if (isFolder) {
          classes += ` ${this._classNames.titleFolder}`;
        }
        classes += ` ${this._buttonLeft ? this._classNames.titleButtonLeft : this._classNames.titleButtonRight}`;
        titleSpan.className = classes;
        titleSpan.setAttribute("role", "treeitem");
        titleSpan.setAttribute("aria-selected", "false");
        return titleSpan;
      }
      _createUlTemplate(isRootNode) {
        let classString;
        let role;
        if (!isRootNode) {
          classString = "";
          role = "group";
        } else {
          classString = this._classNames.tree;
          role = "tree";
          if (this._rtl) {
            classString += ` ${this._classNames.rtl}`;
          }
        }
        if (this._dragAndDrop) {
          classString += ` ${this._classNames.dnd}`;
        }
        const ul = document.createElement("ul");
        ul.className = `${this._classNames.common} ${classString}`;
        ul.setAttribute("role", role);
        return ul;
      }

      /* Set the parts of a cloned title span that differ per node */
      _fillTitleSpan(titleSpan, nodeName, isSelected, level) {
        titleSpan.setAttribute("aria-label", nodeName);
        titleSpan.setAttribute("aria-level", `${level}`);
        if (isSelected) {
          titleSpan.setAttribute("aria-selected", "true");
          const tabIndex = this._tabIndex;
          if (tabIndex !== undefined) {
            titleSpan.setAttribute("tabindex", `${tabIndex}`);
          }
        }
        if (this._autoEscape) {
          titleSpan.textContent = nodeName;
        } else {
          titleSpan.innerHTML = nodeName;
        }
      }
      _getButtonClasses(isOpen) {
        const classes = [this._classNames.toggler, this._classNames.common];
        if (!isOpen) {
          classes.push(this._classNames.closed);
        }
        if (this._buttonLeft) {
          classes.push(this._classNames.togglerLeft);
        } else {
          classes.push(this._classNames.togglerRight);
        }
        return classes.join(" ");
      }

      /* The children of a closed folder are rendered when it is opened */
      _mustRenderChildren(node) {
        return node.hasChildren() && node.is_open === true;
      }
    }

    class KeyHandler {
      _closeNode;
      _getSelectedNode;
      _isFocusOnTree;
      _keyboardSupport;
      _openNode;
      _originalSelectNode;
      constructor({
        _closeNode: closeNode,
        _getSelectedNode: getSelectedNode,
        _isFocusOnTree: isFocusOnTree,
        _keyboardSupport: keyboardSupport,
        _openNode: openNode,
        _selectNode: selectNode
      }) {
        this._closeNode = closeNode;
        this._getSelectedNode = getSelectedNode;
        this._isFocusOnTree = isFocusOnTree;
        this._keyboardSupport = keyboardSupport;
        this._openNode = openNode;
        this._originalSelectNode = selectNode;
        if (keyboardSupport) {
          document.addEventListener("keydown", this._handleKeyDown);
        }
      }
      _deinit() {
        if (this._keyboardSupport) {
          document.removeEventListener("keydown", this._handleKeyDown);
        }
      }
      _moveDown(selectedNode) {
        return this._selectNode(selectedNode.getNextVisibleNode());
      }
      _moveUp(selectedNode) {
        return this._selectNode(selectedNode.getPreviousVisibleNode());
      }
      _canHandleKeyboard() {
        return this._keyboardSupport && this._isFocusOnTree();
      }
      _handleKeyDown = e => {
        if (!this._canHandleKeyboard()) {
          return;
        }
        let isKeyHandled = false;
        const selectedNode = this._getSelectedNode();
        if (selectedNode) {
          switch (e.key) {
            case "ArrowDown":
              isKeyHandled = this._moveDown(selectedNode);
              break;
            case "ArrowLeft":
              isKeyHandled = this._moveLeft(selectedNode);
              break;
            case "ArrowRight":
              isKeyHandled = this._moveRight(selectedNode);
              break;
            case "ArrowUp":
              isKeyHandled = this._moveUp(selectedNode);
              break;
          }
        }
        if (isKeyHandled) {
          e.preventDefault();
        }
      };
      _moveLeft(selectedNode) {
        if (selectedNode.isFolder() && selectedNode.is_open) {
          // Left on an open node closes the node
          this._closeNode(selectedNode);
          return true;
        } else {
          // Left on a closed or end node moves focus to the node's parent
          return this._selectNode(selectedNode.getParent());
        }
      }
      _moveRight(selectedNode) {
        if (!selectedNode.isFolder()) {
          return false;
        } else {
          // folder node
          if (selectedNode.is_open) {
            // Right moves to the first child of an open node
            return this._selectNode(selectedNode.getNextVisibleNode());
          } else {
            // Right expands a closed node
            void this._openNode(selectedNode);
            return true;
          }
        }
      }

      /* Select the node.
       * Don't do anything if the node is null.
       * Result: a different node was selected.
       */
      _selectNode(node) {
        if (!node) {
          return false;
        } else {
          this._originalSelectNode(node);
          return true;
        }
      }
    }

    const getPositionInfoFromMouseEvent = e => ({
      originalEvent: e,
      pageX: e.pageX,
      pageY: e.pageY,
      target: e.target
    });
    const getPositionInfoFromTouch = (touch, e) => ({
      originalEvent: e,
      pageX: touch.pageX,
      pageY: touch.pageY,
      target: touch.target
    });

    class MouseHandler {
      _classNames;
      _element;
      _getMouseDelay;
      _getNode;
      _isMouseDelayMet;
      _isMouseStarted;
      _mouseDelayTimer;
      _mouseDownInfo;
      _onClickButton;
      _onClickTitle;
      _onMouseCapture;
      _onMouseDrag;
      _onMouseStart;
      _onMouseStop;
      _triggerEvent;
      _useContextMenu;
      constructor({
        _classNames: classNames,
        _element: element,
        _getMouseDelay: getMouseDelay,
        _getNode: getNode,
        _onClickButton: onClickButton,
        _onClickTitle: onClickTitle,
        _onMouseCapture: onMouseCapture,
        _onMouseDrag: onMouseDrag,
        _onMouseStart: onMouseStart,
        _onMouseStop: onMouseStop,
        _triggerEvent: triggerEvent,
        _useContextMenu: useContextMenu
      }) {
        this._classNames = classNames;
        this._element = element;
        this._getMouseDelay = getMouseDelay;
        this._getNode = getNode;
        this._onClickButton = onClickButton;
        this._onClickTitle = onClickTitle;
        this._onMouseCapture = onMouseCapture;
        this._onMouseDrag = onMouseDrag;
        this._onMouseStart = onMouseStart;
        this._onMouseStop = onMouseStop;
        this._triggerEvent = triggerEvent;
        this._useContextMenu = useContextMenu;
        element.addEventListener("click", this._handleClick);
        element.addEventListener("dblclick", this._handleDblclick);
        element.addEventListener("mousedown", this._mouseDown, {
          passive: false
        });
        element.addEventListener("touchstart", this._touchStart, {
          passive: false
        });
        if (useContextMenu) {
          element.addEventListener("contextmenu", this._handleContextmenu);
        }
        this._isMouseStarted = false;
        this._mouseDelayTimer = null;
        this._isMouseDelayMet = false;
        this._mouseDownInfo = null;
      }
      _deinit() {
        this._element.removeEventListener("click", this._handleClick);
        this._element.removeEventListener("dblclick", this._handleDblclick);
        if (this._useContextMenu) {
          this._element.removeEventListener("contextmenu", this._handleContextmenu);
        }
        this._element.removeEventListener("mousedown", this._mouseDown);
        this._element.removeEventListener("touchstart", this._touchStart);
        this._removeMouseMoveEventListeners();
      }
      _getClickTarget(element) {
        const button = element.closest(`.${this._classNames.toggler}`);
        if (button) {
          const node = this._getNode(button);
          if (node) {
            return {
              node,
              type: "button"
            };
          }
        } else {
          const treeElement = element.closest(`.${this._classNames.element}`);
          if (treeElement) {
            const node = this._getNode(treeElement);
            if (node) {
              return {
                node,
                type: "label"
              };
            }
          }
        }
        return null;
      }
      _handleClick = e => {
        if (!e.target) {
          return;
        }
        const clickTarget = this._getClickTarget(e.target);
        if (!clickTarget) {
          return;
        }
        switch (clickTarget.type) {
          case "button":
            this._onClickButton(clickTarget.node);
            e.preventDefault();
            e.stopPropagation();
            break;
          case "label":
            {
              if (this._triggerEvent("tree.click", {
                node: clickTarget.node,
                originalEvent: e
              })) {
                this._onClickTitle(clickTarget.node);
              }
              break;
            }
        }
      };
      _handleContextmenu = e => {
        if (!e.target) {
          return;
        }
        const div = e.target.closest(`ul.${this._classNames.tree} .${this._classNames.element}`);
        if (div) {
          const node = this._getNode(div);
          if (node) {
            e.preventDefault();
            e.stopPropagation();
            this._triggerEvent("tree.contextmenu", {
              node,
              originalEvent: e
            });
            return false;
          }
        }
        return null;
      };
      _handleDblclick = e => {
        if (!e.target) {
          return;
        }
        const clickTarget = this._getClickTarget(e.target);
        if (clickTarget?.type === "label") {
          this._triggerEvent("tree.dblclick", {
            node: clickTarget.node,
            originalEvent: e
          });
        }
      };
      _handleMouseDown(positionInfo) {
        // We may have missed mouseup (out of window)
        if (this._isMouseStarted) {
          this._handleMouseUp(positionInfo);
        }
        this._mouseDownInfo = positionInfo;
        if (!this._onMouseCapture(positionInfo)) {
          return false;
        }
        this._handleStartMouse();
        return true;
      }
      _handleMouseMove(e, positionInfo) {
        if (this._isMouseStarted) {
          this._onMouseDrag(positionInfo);
          if (e.cancelable) {
            e.preventDefault();
          }
          return;
        }
        if (!this._isMouseDelayMet) {
          return;
        }
        if (this._mouseDownInfo) {
          this._isMouseStarted = this._onMouseStart(this._mouseDownInfo);
        }
        if (this._isMouseStarted) {
          this._onMouseDrag(positionInfo);
          if (e.cancelable) {
            e.preventDefault();
          }
        } else {
          this._handleMouseUp(positionInfo);
        }
      }
      _handleMouseUp(positionInfo) {
        this._removeMouseMoveEventListeners();
        this._isMouseDelayMet = false;
        this._mouseDownInfo = null;
        if (this._isMouseStarted) {
          this._isMouseStarted = false;
          this._onMouseStop(positionInfo);
        }
      }
      _handleStartMouse() {
        document.addEventListener("mousemove", this._mouseMove, {
          passive: false
        });
        document.addEventListener("touchmove", this._touchMove, {
          passive: false
        });
        document.addEventListener("mouseup", this._mouseUp, {
          passive: false
        });
        document.addEventListener("touchend", this._touchEnd, {
          passive: false
        });
        const mouseDelay = this._getMouseDelay();
        if (mouseDelay) {
          this._startMouseDelayTimer(mouseDelay);
        } else {
          this._isMouseDelayMet = true;
        }
      }
      _mouseDown = e => {
        // Left mouse button?
        if (e.button !== 0) {
          return;
        }
        const result = this._handleMouseDown(getPositionInfoFromMouseEvent(e));
        if (result && e.cancelable) {
          e.preventDefault();
        }
      };
      _mouseMove = e => {
        this._handleMouseMove(e, getPositionInfoFromMouseEvent(e));
      };
      _mouseUp = e => {
        this._handleMouseUp(getPositionInfoFromMouseEvent(e));
      };
      _removeMouseMoveEventListeners() {
        document.removeEventListener("mousemove", this._mouseMove);
        document.removeEventListener("touchmove", this._touchMove);
        document.removeEventListener("mouseup", this._mouseUp);
        document.removeEventListener("touchend", this._touchEnd);
      }
      _startMouseDelayTimer(mouseDelay) {
        if (this._mouseDelayTimer) {
          clearTimeout(this._mouseDelayTimer);
        }
        this._mouseDelayTimer = window.setTimeout(() => {
          if (this._mouseDownInfo) {
            this._isMouseDelayMet = true;
          }
        }, mouseDelay);
        this._isMouseDelayMet = false;
      }
      _touchEnd = e => {
        if (e.touches.length > 1) {
          return;
        }
        const touch = e.touches[0];
        if (!touch) {
          return;
        }
        this._handleMouseUp(getPositionInfoFromTouch(touch, e));
      };
      _touchMove = e => {
        if (e.touches.length > 1) {
          return;
        }
        const touch = e.touches[0];
        if (!touch) {
          return;
        }
        this._handleMouseMove(e, getPositionInfoFromTouch(touch, e));
      };
      _touchStart = e => {
        if (e.touches.length > 1) {
          return;
        }
        const touch = e.touches[0];
        if (!touch) {
          return;
        }
        this._handleMouseDown(getPositionInfoFromTouch(touch, e));
      };
    }

    const isNodeRecordWithChildren = data => typeof data === "object" && "children" in data && data.children instanceof Array;

    /*
    A node reads and writes the private members of other nodes (node.setParent),
    so the `_` prefix that the build adds cannot be limited to `this.`:

    prefix-private-members: all
    */

    /**
     * @groupDescription Properties
     * Any other key in the node data is copied onto the node, so
     * `{ name: "node1", color: "green" }` gives you `node.color`.
     *
     * @groupDescription Searching
     * These work on any node, and search that node's subtree. Called on the root
     * node, they search the whole tree — which is what the tree's own methods of
     * the same name do.
     *
     * @groupDescription Changing the tree
     * ::: warning
     * These methods change the data without re-rendering. The tree's
     * [methods](/reference/methods) — `appendNode`, `removeNode`, `moveNode` and
     * friends — do the same and refresh the display, so prefer those. If you do
     * use these, call `tree.refresh()` afterwards.
     * :::
     */
    class Node {
      /** @hidden */

      /** The child nodes. */
      children;
      /** The `li` element, once the node is rendered. Nodes inside a closed
       * folder are rendered when the folder is opened. */
      element;
      /** The id from the node data. */
      id;
      /** @hidden */
      idMapping;
      /** Whether the node's children are being fetched. */
      is_loading;
      /** Whether the folder is open. */
      is_open;
      /** Whether the node data had an empty `children` array. */
      isEmptyFolder;
      /** Whether the children still have to be fetched. */
      load_on_demand;
      /** The label. Also settable from the `label` key in node data. */
      name;
      /** @hidden */
      nodeClass;
      /** The parent; `null` for the root node. */
      parent;
      /** The root node. */
      tree;

      /** @hidden */
      constructor(nodeData = null, isRoot = false, nodeClass = Node) {
        this.name = "";
        this.load_on_demand = false;
        this.isEmptyFolder = nodeData != null && isNodeRecordWithChildren(nodeData) && nodeData.children.length === 0;
        this.setData(nodeData);
        this.children = [];
        this.parent = null;
        this.is_loading = undefined;
        this.is_open ??= undefined;
        if (isRoot) {
          this.idMapping = new Map();
          this.tree = this;
          this.nodeClass = nodeClass;
        } else {
          this.idMapping = undefined;
        }
      }

      /**
       * Adds a sibling after this node.
       *
       * @returns The new node, or `null` when the node has no parent.
       * @group Changing the tree
       */
      addAfter(nodeInfo) {
        if (!this.parent) {
          return null;
        } else {
          const node = this._createNode(nodeInfo);
          const childIndex = this.parent.getChildIndex(this);
          this.parent.addChildAtPosition(node, childIndex + 1);
          node._loadChildrenFromData(nodeInfo);
          return node;
        }
      }

      /**
       * Adds a sibling before this node.
       *
       * @returns The new node, or `null` when the node has no parent.
       * @group Changing the tree
       */
      addBefore(nodeInfo) {
        if (!this.parent) {
          return null;
        } else {
          const node = this._createNode(nodeInfo);
          const childIndex = this.parent.getChildIndex(this);
          this.parent.addChildAtPosition(node, childIndex);
          node._loadChildrenFromData(nodeInfo);
          return node;
        }
      }

      /**
       * Adds an existing `Node` object as the last child.
       *
       * @group Changing the tree
       */
      addChild(node) {
        this.children.push(node);
        node._setParent(this);
      }

      /**
       * Adds an existing `Node` object as a child, at this position in
       * `children`. The index starts at `0`.
       *
       * @group Changing the tree
       */
      addChildAtPosition(node, index) {
        this.children.splice(index, 0, node);
        node._setParent(this);
      }

      /** @hidden */
      addNodeToIndex(node) {
        if (node.id != null) {
          this.idMapping?.set(node.id, node);
        }
      }

      /**
       * Inserts a new parent between this node and its current parent.
       *
       * @returns The new node, or `null` when the node has no parent.
       * @group Changing the tree
       */
      addParent(nodeInfo) {
        if (!this.parent) {
          return null;
        } else {
          const newParent = this._createNode(nodeInfo);
          if (this.tree) {
            newParent._setParent(this.tree);
          }
          const originalParent = this.parent;
          for (const child of originalParent.children) {
            newParent.addChild(child);
          }
          originalParent.children = [];
          originalParent.addChild(newParent);
          return newParent;
        }
      }

      /**
       * Adds a child at the end.
       *
       * @returns The new node.
       * @group Changing the tree
       */
      append(nodeInfo) {
        const node = this._createNode(nodeInfo);
        this.addChild(node);
        node._loadChildrenFromData(nodeInfo);
        return node;
      }

      /**
       * Returns all nodes in the subtree for which the callback returns
       * `true`.
       *
       * @example
       * ```js
       * const folders = tree.getTree().filter((node) => node.isFolder());
       * ```
       *
       * @group Searching
       */
      filter(f) {
        const result = [];
        this.iterate(node => {
          if (f(node)) {
            result.push(node);
          }
          return true;
        });
        return result;
      }

      /**
       * Returns the position of a child in `children`, or `-1`.
       *
       * @group Inspecting a node
       */
      getChildIndex(node) {
        return this.children.indexOf(node);
      }

      /**
       * Returns the subtree as plain data, ready for `JSON.stringify`.
       * Internal properties (`parent`, `children`, `element`, `tree`,
       * `idMapping`, `nodeClass`, `load_on_demand`, `isEmptyFolder`) are left
       * out; your own properties are kept.
       *
       * ```js
       * tree.getTree().getData();
       * // [{ name: "node1", id: 1, children: [{ name: "child1", id: 2 }] }]
       * ```
       *
       * @param includeParent - Make the result the node itself rather than its
       * children. Default `false`.
       * @group Reading data back
       */
      getData(includeParent = false) {
        const getDataFromNodes = nodes => {
          return nodes.map(node => {
            const tmpNode = {};
            for (const k in node) {
              if (["parent", "children", "element", "idMapping", "load_on_demand", "nodeClass", "tree", "isEmptyFolder"].indexOf(k) === -1 && Object.prototype.hasOwnProperty.call(node, k)) {
                const v = node[k];
                tmpNode[k] = v;
              }
            }
            if (node.hasChildren()) {
              tmpNode.children = getDataFromNodes(node.children);
            }
            return tmpNode;
          });
        };
        if (includeParent) {
          return getDataFromNodes([this]);
        } else {
          return getDataFromNodes(this.children);
        }
      }

      /**
       * Returns the last child, or `null`. When that child is an open folder,
       * its own last child, and so on.
       *
       * @group Moving around the tree
       */
      getLastChild() {
        if (!this.hasChildren()) {
          return null;
        } else {
          const lastChild = this.children[this.children.length - 1];
          if (!(lastChild.hasChildren() && lastChild.is_open)) {
            return lastChild;
          } else {
            return lastChild.getLastChild();
          }
        }
      }

      /**
       * Returns the depth of the node, counting the top level as `1`.
       *
       * @group Inspecting a node
       */
      getLevel() {
        let level = 0;
        let node = this; // eslint-disable-line @typescript-eslint/no-this-alias

        while (node.parent) {
          level += 1;
          node = node.parent;
        }
        return level;
      }

      /**
       * Returns the next node in the tree, regardless of whether it is
       * visible. `getNextNode(false)` skips the node's own children.
       *
       * @group Moving around the tree
       */
      getNextNode(includeChildren = true) {
        if (includeChildren && this.hasChildren()) {
          return this.children[0] ?? null;
        } else if (!this.parent) {
          return null;
        } else {
          const nextSibling = this.getNextSibling();
          if (nextSibling) {
            return nextSibling;
          } else {
            return this.parent.getNextNode(false);
          }
        }
      }

      /**
       * Returns the next sibling, or `null`.
       *
       * @group Moving around the tree
       */
      getNextSibling() {
        if (!this.parent) {
          return null;
        } else {
          const nextIndex = this.parent.getChildIndex(this) + 1;
          if (nextIndex < this.parent.children.length) {
            return this.parent.children[nextIndex] ?? null;
          } else {
            return null;
          }
        }
      }

      /**
       * Like `getNextNode`, but skipping nodes inside closed folders — this is
       * what the arrow keys use.
       *
       * @group Moving around the tree
       */
      getNextVisibleNode() {
        if (this.hasChildren() && this.is_open) {
          // First child
          return this.children[0] ?? null;
        } else {
          if (!this.parent) {
            return null;
          } else {
            const nextSibling = this.getNextSibling();
            if (nextSibling) {
              // Next sibling
              return nextSibling;
            } else {
              // Next node of parent
              return this.parent.getNextNode(false);
            }
          }
        }
      }

      /**
       * Returns the first node for which the callback returns `true`.
       *
       * @group Searching
       */
      getNodeByCallback(callback) {
        let result = null;
        this.iterate(node => {
          if (result) {
            return false;
          } else if (callback(node)) {
            result = node;
            return false;
          } else {
            return true;
          }
        });
        return result;
      }

      /**
       * Returns the node with this id. Only available on the root node, which
       * keeps the id index.
       *
       * @group Searching
       */
      getNodeById(nodeId) {
        return this.idMapping?.get(nodeId) ?? null;
      }

      /**
       * Returns the first node with this name.
       *
       * @group Searching
       */
      getNodeByName(name) {
        return this.getNodeByCallback(node => node.name === name);
      }

      /**
       * Like `getNodeByName`, but throws when there is no such node.
       *
       * @group Searching
       */
      getNodeByNameMustExist(name) {
        const node = this.getNodeByCallback(n => n.name === name);
        if (!node) {
          throw new Error(`Node with name ${name} not found`);
        }
        return node;
      }

      /**
       * Returns all nodes with this property value.
       *
       * @group Searching
       */
      getNodesByProperty(key, value) {
        return this.filter(node => node[key] === value);
      }

      /**
       * Returns the parent: `null` for a top-level node — the root node is not
       * returned.
       *
       * @group Moving around the tree
       */
      getParent() {
        // Return parent except if it is the root node
        if (!this.parent) {
          return null;
        } else if (!this.parent.parent) {
          // Root node -> null
          return null;
        } else {
          return this.parent;
        }
      }

      /**
       * Returns the previous node in the tree, regardless of whether it is
       * visible.
       *
       * @group Moving around the tree
       */
      getPreviousNode() {
        if (!this.parent) {
          return null;
        } else {
          const previousSibling = this.getPreviousSibling();
          if (!previousSibling) {
            return this.getParent();
          } else if (previousSibling.hasChildren()) {
            return previousSibling.getLastChild();
          } else {
            return previousSibling;
          }
        }
      }

      /**
       * Returns the previous sibling, or `null`.
       *
       * @group Moving around the tree
       */
      getPreviousSibling() {
        if (!this.parent) {
          return null;
        } else {
          const previousIndex = this.parent.getChildIndex(this) - 1;
          if (previousIndex >= 0) {
            return this.parent.children[previousIndex] ?? null;
          } else {
            return null;
          }
        }
      }

      /**
       * Like `getPreviousNode`, but skipping nodes inside closed folders —
       * this is what the arrow keys use.
       *
       * @group Moving around the tree
       */
      getPreviousVisibleNode() {
        if (!this.parent) {
          return null;
        } else {
          const previousSibling = this.getPreviousSibling();
          if (!previousSibling) {
            return this.getParent();
          } else if (!previousSibling.hasChildren() || !previousSibling.is_open) {
            // Previous sibling
            return previousSibling;
          } else {
            // Last child of previous sibling
            return previousSibling.getLastChild();
          }
        }
      }

      /**
       * Whether the node has children.
       *
       * @group Inspecting a node
       */
      hasChildren() {
        return this.children.length !== 0;
      }

      /**
       * Init Node from data without making it the root of the tree.
       *
       * @hidden
       */
      initFromData(data) {
        const addNode = nodeData => {
          this.setData(nodeData);
          if (isNodeRecordWithChildren(nodeData) && nodeData.children.length) {
            addChildren(nodeData.children);
          }
        };
        const addChildren = childrenData => {
          for (const child of childrenData) {
            const node = this._createNode();
            node.initFromData(child);
            this.addChild(node);
          }
        };
        addNode(data);
      }

      /**
       * `true` when the node has children, or is marked `load_on_demand`.
       *
       * @group Inspecting a node
       */
      isFolder() {
        return this.hasChildren() || this.load_on_demand;
      }

      /**
       * Whether this node is an ancestor of the other node.
       *
       * @group Inspecting a node
       */
      isParentOf(node) {
        let parent = node.parent;
        while (parent) {
          if (parent === this) {
            return true;
          }
          parent = parent.parent;
        }
        return false;
      }

      /**
       * Walks the subtree, calling the callback with `(node, level)`. Return
       * `false` from the callback to stop descending into that node:
       *
       * ```js
       * tree.getTree().iterate((node, level) => {
       *   console.log(" ".repeat(level) + node.name);
       *   return level <= 2; // don't go deeper than level 2
       * });
       * ```
       *
       * @group Searching
       */
      iterate(callback) {
        const _iterate = (node, level) => {
          for (const child of node.children) {
            const result = callback(child, level);
            if (result && child.hasChildren()) {
              _iterate(child, level + 1);
            }
          }
        };
        _iterate(this, 0);
      }

      /**
       * Replaces the children with new node data.
       *
       * @group Changing the tree
       */
      loadFromData(data) {
        this.removeChildren();
        for (const childData of data) {
          const node = this._createNode(childData);
          this.addChild(node);
          if (isNodeRecordWithChildren(childData)) {
            node.loadFromData(childData.children);
          }
        }
        return this;
      }

      /**
       * Moves a node relative to another node. Called on the root node.
       *
       * @param position - `"before"`, `"after"` or `"inside"`.
       * @returns `false` when the move is impossible, for instance moving a
       * node into its own subtree.
       * @group Changing the tree
       */
      moveNode(movedNode, targetNode, position) {
        if (!movedNode.parent || movedNode.isParentOf(targetNode)) {
          // - Node is parent of target node
          // - Or, parent is empty
          return false;
        } else {
          movedNode.parent._doRemoveChild(movedNode);
          switch (position) {
            case "after":
              {
                if (targetNode.parent) {
                  targetNode.parent.addChildAtPosition(movedNode, targetNode.parent.getChildIndex(targetNode) + 1);
                  return true;
                }
                return false;
              }
            case "before":
              {
                if (targetNode.parent) {
                  targetNode.parent.addChildAtPosition(movedNode, targetNode.parent.getChildIndex(targetNode));
                  return true;
                }
                return false;
              }
            case "inside":
              {
                // move inside as first child
                targetNode.addChildAtPosition(movedNode, 0);
                return true;
              }
          }
        }
      }

      /**
       * Adds a child at the start.
       *
       * @returns The new node.
       * @group Changing the tree
       */
      prepend(nodeInfo) {
        const node = this._createNode(nodeInfo);
        this.addChildAtPosition(node, 0);
        node._loadChildrenFromData(nodeInfo);
        return node;
      }

      /**
       * Removes this node from its parent.
       *
       * @group Changing the tree
       */
      remove() {
        if (this.parent) {
          this.parent.removeChild(this);
          this.parent = null;
        }
      }

      /**
       * Removes a child and its children.
       *
       * @group Changing the tree
       */
      removeChild(node) {
        // remove children from the index
        node.removeChildren();
        this._doRemoveChild(node);
      }

      /**
       * Removes all children.
       *
       * @group Changing the tree
       */
      removeChildren() {
        this.iterate(child => {
          this.tree?.removeNodeFromIndex(child);
          return true;
        });
        this.children = [];
      }

      /** @hidden */
      removeNodeFromIndex(node) {
        if (node.id != null) {
          this.idMapping?.delete(node.id);
        }
      }

      /**
       * Updates the node's properties from node data. `children` and `parent`
       * are ignored. A string sets the name. Existing node values are not
       * removed.
       *
       * @group Changing the tree
       */
      setData(o) {
        if (!o) {
          return;
        } else if (typeof o === "string") {
          this.name = o;
        } else if (typeof o === "object") {
          for (const key in o) {
            if (Object.prototype.hasOwnProperty.call(o, key)) {
              const value = o[key];
              if (key === "label" || key === "name") {
                // You can use the 'label' key instead of 'name'; this is a legacy feature
                if (typeof value === "string") {
                  this.name = value;
                }
              } else if (key !== "children" && key !== "parent") {
                // You can't update the children or the parent using this function
                this[key] = value;
              }
            }
          }
        }
      }
      _createNode(nodeData) {
        const nodeClass = this._getNodeClass();
        return new nodeClass(nodeData);
      }
      _doRemoveChild(node) {
        this.children.splice(this.getChildIndex(node), 1);
        this.tree?.removeNodeFromIndex(node);
      }
      _getNodeClass() {
        return this.nodeClass ?? this.tree?.nodeClass ?? Node;
      }

      // Load children data from nodeInfo if it has children
      _loadChildrenFromData(nodeInfo) {
        if (isNodeRecordWithChildren(nodeInfo) && nodeInfo.children.length) {
          this.loadFromData(nodeInfo.children);
        }
      }
      _setParent(parent) {
        this.parent = parent;
        this.tree = parent.tree;
        this.tree?.addNodeToIndex(this);
      }
    }

    class BorderDropHint {
      _hint;
      constructor(element, scrollLeft, classNames) {
        const div = element.querySelector(`:scope > .${classNames.element}`);
        if (!div) {
          this._hint = undefined;
          return;
        }
        const width = Math.max(element.offsetWidth + scrollLeft - 4, 0);
        const height = Math.max(element.clientHeight - 4, 0);
        const hint = document.createElement("span");
        hint.className = classNames.border;
        hint.style.width = `${width}px`;
        hint.style.height = `${height}px`;
        this._hint = hint;
        div.append(this._hint);
      }
      remove() {
        this._hint?.remove();
      }
    }

    class GhostDropHint {
      _classNames;
      _element;
      _ghost;
      _node;
      constructor(node, element, position, classNames) {
        this._classNames = classNames;
        this._element = element;
        this._node = node;
        this._ghost = this._createGhostElement();
        switch (position) {
          case "after":
            this._moveAfter();
            break;
          case "before":
            this._moveBefore();
            break;
          case "inside":
            {
              if (node.isFolder() && node.is_open) {
                this._moveInsideOpenFolder();
              } else {
                this._moveInside();
              }
            }
        }
      }
      remove() {
        this._ghost.remove();
      }
      _createGhostElement() {
        const {
          circle,
          common,
          ghost: ghostClass,
          line
        } = this._classNames;
        const ghost = document.createElement("li");
        ghost.className = `${common} ${ghostClass}`;
        const circleSpan = document.createElement("span");
        circleSpan.className = `${common} ${circle}`;
        ghost.append(circleSpan);
        const lineSpan = document.createElement("span");
        lineSpan.className = `${common} ${line}`;
        ghost.append(lineSpan);
        return ghost;
      }
      _moveAfter() {
        this._element.after(this._ghost);
      }
      _moveBefore() {
        this._element.before(this._ghost);
      }
      _moveInside() {
        this._element.after(this._ghost);
        this._ghost.classList.add(this._classNames.inside);
      }
      _moveInsideOpenFolder() {
        const childElement = this._node.children[0]?.element;
        if (childElement) {
          childElement.before(this._ghost);
        }
      }
    }

    class NodeElement {
      _element;
      _node;
      _classNames;
      _getScrollLeft;
      _tabIndex;
      _treeElement;
      constructor({
        _classNames: classNames,
        _getScrollLeft: getScrollLeft,
        _node: node,
        _tabIndex: tabIndex,
        _treeElement: treeElement
      }) {
        this._classNames = classNames;
        this._getScrollLeft = getScrollLeft;
        this._node = node;
        this._tabIndex = tabIndex;
        this._treeElement = treeElement;

        // The root node has no element of its own; it uses the tree element.
        this._element = node.element ?? this._treeElement;
      }
      _addDropHint(position) {
        if (this._mustShowBorderDropHint(position)) {
          return new BorderDropHint(this._element, this._getScrollLeft(), this._classNames);
        } else {
          return new GhostDropHint(this._node, this._element, position, this._classNames);
        }
      }
      _deselect() {
        if (!this._isRendered()) {
          return;
        }
        this._element.classList.remove(this._classNames.selected);
        const titleSpan = this._getTitleSpan();
        titleSpan.removeAttribute("tabindex");
        titleSpan.setAttribute("aria-selected", "false");
        titleSpan.blur();
      }
      _select(mustSetFocus) {
        if (!this._isRendered()) {
          return;
        }
        this._element.classList.add(this._classNames.selected);
        const titleSpan = this._getTitleSpan();
        const tabIndex = this._tabIndex;

        // Check for null or undefined
        if (tabIndex != null) {
          titleSpan.setAttribute("tabindex", tabIndex.toString());
        }
        titleSpan.setAttribute("aria-selected", "true");
        if (mustSetFocus) {
          titleSpan.focus();
        }
      }
      _getTitleSpan() {
        return this._element.querySelector(`:scope > .${this._classNames.element} > span.${this._classNames.title}`);
      }
      _getUl() {
        return this._element.querySelector(":scope > ul");
      }

      /* A node inside a closed folder is not rendered. Its selected and open
       * state is applied when it is rendered.
       */
      _isRendered() {
        return Boolean(this._node.element);
      }
      _mustShowBorderDropHint(position) {
        return position === "inside";
      }
    }

    const getAnimationDuration = duration => {
      if (typeof duration === "number") {
        return duration;
      }
      return duration === "slow" ? 600 : 200;
    };
    const slideDown = (element, animationSpeed, onFinished) => {
      element.style.display = "block";
      const animation = element.animate([{
        height: "0",
        overflow: "hidden"
      }, {
        height: `${element.scrollHeight}px`,
        overflow: "hidden"
      }], {
        duration: getAnimationDuration(animationSpeed)
      });
      animation.onfinish = () => {
        onFinished();
      };
    };
    const slideUp = (element, animationSpeed, onFinished) => {
      const animation = element.animate([{
        height: `${element.scrollHeight}px`,
        overflow: "hidden"
      }, {
        height: "0",
        overflow: "hidden"
      }], {
        duration: getAnimationDuration(animationSpeed)
      });
      animation.onfinish = () => {
        element.style.display = "none";
        onFinished();
      };
    };

    class FolderElement extends NodeElement {
      _closedIconElement;
      _openedIconElement;
      _renderChildren;
      _triggerEvent;
      constructor({
        _classNames: classNames,
        _closedIconElement: closedIconElement,
        _getScrollLeft: getScrollLeft,
        _node: node,
        _openedIconElement: openedIconElement,
        _renderChildren: renderChildren,
        _tabIndex: tabIndex,
        _treeElement: treeElement,
        _triggerEvent: triggerEvent
      }) {
        super({
          _classNames: classNames,
          _getScrollLeft: getScrollLeft,
          _node: node,
          _tabIndex: tabIndex,
          _treeElement: treeElement
        });
        this._closedIconElement = closedIconElement;
        this._openedIconElement = openedIconElement;
        this._renderChildren = renderChildren;
        this._triggerEvent = triggerEvent;
      }
      _close(slide, animationSpeed) {
        if (!this._node.is_open) {
          return;
        }
        this._node.is_open = false;
        if (!this._isRendered()) {
          this._triggerEvent("tree.close", {
            node: this._node
          });
          return;
        }
        const button = this._getButton();
        button.classList.add(this._classNames.closed);
        button.innerHTML = "";
        const closedIconElement = this._closedIconElement;
        if (closedIconElement) {
          const icon = closedIconElement.cloneNode(true);
          button.appendChild(icon);
        }
        const doClose = () => {
          this._element.classList.add(this._classNames.closed);
          const titleSpan = this._getTitleSpan();
          titleSpan.setAttribute("aria-expanded", "false");
          this._triggerEvent("tree.close", {
            node: this._node
          });
        };
        const ul = this._getUl();
        if (!ul) {
          doClose();
        } else if (slide) {
          slideUp(ul, animationSpeed, doClose);
        } else {
          ul.style.display = "none";
          doClose();
        }
      }
      async _open(slide, animationSpeed) {
        return new Promise(resolve => {
          if (this._node.is_open) {
            resolve();
            return;
          }
          this._node.is_open = true;
          if (!this._isRendered()) {
            // The folder is rendered open when its parent is opened
            this._triggerEvent("tree.open", {
              node: this._node
            });
            resolve();
            return;
          }
          const button = this._getButton();
          button.classList.remove(this._classNames.closed);
          button.innerHTML = "";
          const openedIconElement = this._openedIconElement;
          if (openedIconElement) {
            const icon = openedIconElement.cloneNode(true);
            button.appendChild(icon);
          }
          const doOpen = () => {
            this._element.classList.remove(this._classNames.closed);
            const titleSpan = this._getTitleSpan();
            titleSpan.setAttribute("aria-expanded", "true");
            this._triggerEvent("tree.open", {
              node: this._node
            });
            resolve();
          };

          // The children are rendered the first time the folder is opened
          const ul = this._getUl() ?? this._renderChildren(this._node);
          if (!ul) {
            doOpen();
          } else if (slide) {
            slideDown(ul, animationSpeed, doOpen);
          } else {
            ul.style.display = "block";
            doOpen();
          }
        });
      }
      _mustShowBorderDropHint(position) {
        return !this._node.is_open && position === "inside";
      }
      _getButton() {
        return this._element.querySelector(`:scope > .${this._classNames.element} > a.${this._classNames.toggler}`);
      }
    }

    // Url class for absolute and relative urls.

    const isAbsoluteUrl = inputUrl => {
      try {
        new URL(inputUrl);
        return true;
      } catch {
        return false;
      }
    };
    const LOCALHOST = "http://localhost";
    class RequestUrl {
      _isAbsolute;
      _url;
      constructor(inputUrl) {
        if (isAbsoluteUrl(inputUrl)) {
          this._url = new URL(inputUrl);
          this._isAbsolute = true;
        } else {
          this._url = new URL(inputUrl, LOCALHOST);
          this._isAbsolute = false;
        }
      }
      _setSearchParam(key, value) {
        this._url.searchParams.set(key, value);
      }
      _value() {
        if (this._isAbsolute) {
          return this._url.href;
        } else {
          return this._url.href.slice(LOCALHOST.length);
        }
      }
    }

    class SaveStateHandler {
      _addToSelection;
      _getNodeById;
      _getSelectedNodes;
      _getTree;
      _onGetStateFromStorage;
      _onSetStateFromStorage;
      _openNode;
      _refreshElements;
      _removeFromSelection;
      _saveStateOption;
      constructor({
        _addToSelection: addToSelection,
        _getNodeById: getNodeById,
        _getSelectedNodes: getSelectedNodes,
        _getTree: getTree,
        _onGetStateFromStorage: onGetStateFromStorage,
        _onSetStateFromStorage: onSetStateFromStorage,
        _openNode: openNode,
        _refreshElements: refreshElements,
        _removeFromSelection: removeFromSelection,
        _saveState: saveState
      }) {
        this._addToSelection = addToSelection;
        this._getNodeById = getNodeById;
        this._getSelectedNodes = getSelectedNodes;
        this._getTree = getTree;
        this._onGetStateFromStorage = onGetStateFromStorage;
        this._onSetStateFromStorage = onSetStateFromStorage;
        this._openNode = openNode;
        this._refreshElements = refreshElements;
        this._removeFromSelection = removeFromSelection;
        this._saveStateOption = saveState;
      }
      _getNodeIdToBeSelected() {
        if (!this._saveStateOption) {
          return null;
        }
        const state = this._getStateFromStorage();
        if (state?.selected_node) {
          return state.selected_node[0] ?? null;
        } else {
          return null;
        }
      }
      _getState() {
        const getOpenNodeIds = () => {
          const openNodes = [];
          this._getTree()?.iterate(node => {
            if (node.is_open && node.id && node.hasChildren()) {
              openNodes.push(node.id);
            }
            return true;
          });
          return openNodes;
        };
        const getSelectedNodeIds = () => {
          const selectedNodeIds = [];
          this._getSelectedNodes().forEach(node => {
            if (node.id != null) {
              selectedNodeIds.push(node.id);
            }
          });
          return selectedNodeIds;
        };
        return {
          open_nodes: getOpenNodeIds(),
          selected_node: getSelectedNodeIds()
        };
      }
      _getStateFromStorage() {
        if (!this._saveStateOption) {
          return null;
        }
        const jsonData = this._loadFromStorage();
        if (jsonData) {
          return this._parseState(jsonData);
        } else {
          return null;
        }
      }
      _saveState() {
        if (!this._saveStateOption) {
          return;
        }
        const state = JSON.stringify(this._getState());
        if (this._onSetStateFromStorage) {
          this._onSetStateFromStorage(state);
        } else {
          localStorage.setItem(this._getKeyName(), state);
        }
      }

      /*
      Set initial state
      Don't handle nodes that are loaded on demand
       result: must load on demand (boolean)
      */
      _setInitialState(state) {
        let mustLoadOnDemand = false;
        if (state.open_nodes) {
          mustLoadOnDemand = this._openInitialNodes(state.open_nodes);
        }
        this._resetSelection();
        if (state.selected_node) {
          this._selectInitialNodes(state.selected_node);
        }
        return mustLoadOnDemand;
      }
      async _setInitialStateOnDemand(state) {
        let nodeIds = state.open_nodes;
        const openNodes = async () => {
          if (!nodeIds) {
            return;
          }
          const newNodesIds = [];
          for (const nodeId of nodeIds) {
            const node = this._getNodeById(nodeId);
            if (!node) {
              newNodesIds.push(nodeId);
            } else {
              if (!node.is_loading) {
                if (node.load_on_demand) {
                  await loadAndOpenNode(node);
                } else {
                  await this._openNode(node, false);
                }
              }
            }
          }
          nodeIds = newNodesIds;
          if (state.selected_node) {
            if (this._selectInitialNodes(state.selected_node)) {
              this._refreshElements(null);
            }
          }
        };
        const loadAndOpenNode = async node => {
          await this._openNode(node, false);
          await openNodes();
        };
        await openNodes();
      }
      _getKeyName() {
        if (typeof this._saveStateOption === "string") {
          return this._saveStateOption;
        } else {
          return "tree";
        }
      }
      _loadFromStorage() {
        if (this._onGetStateFromStorage) {
          return this._onGetStateFromStorage();
        } else {
          return localStorage.getItem(this._getKeyName());
        }
      }
      _openInitialNodes(nodeIds) {
        let mustLoadOnDemand = false;
        for (const nodeId of nodeIds) {
          const node = this._getNodeById(nodeId);
          if (node) {
            if (!node.load_on_demand) {
              node.is_open = true;
            } else {
              mustLoadOnDemand = true;
            }
          }
        }
        return mustLoadOnDemand;
      }
      _parseState(jsonData) {
        const state = JSON.parse(jsonData);

        // Check if selected_node is an int (instead of an array)
        if (state.selected_node && isInt(state.selected_node)) {
          // Convert to array
          state.selected_node = [state.selected_node];
        }
        return state;
      }
      _resetSelection() {
        const selectedNodes = this._getSelectedNodes();
        selectedNodes.forEach(node => {
          this._removeFromSelection(node);
        });
      }
      _selectInitialNodes(nodeIds) {
        let selectCount = 0;
        for (const nodeId of nodeIds) {
          const node = this._getNodeById(nodeId);
          if (node) {
            selectCount += 1;
            this._addToSelection(node);
          }
        }
        return selectCount !== 0;
      }
    }

    class ScrollParent {
      _container;
      _horizontalScrollDirection;
      _horizontalScrollTimeout;
      _refreshHitAreas;
      _verticalScrollDirection;
      _verticalScrollTimeout;
      constructor({
        _container: container,
        _refreshHitAreas: refreshHitAreas
      }) {
        this._container = container;
        this._refreshHitAreas = refreshHitAreas;
      }
      _checkHorizontalScrolling(pageX) {
        const newHorizontalScrollDirection = this._getNewHorizontalScrollDirection(pageX);
        if (this._horizontalScrollDirection !== newHorizontalScrollDirection) {
          this._horizontalScrollDirection = newHorizontalScrollDirection;
          if (this._horizontalScrollTimeout != null) {
            window.clearTimeout(this._horizontalScrollTimeout);
          }
          if (newHorizontalScrollDirection) {
            this._horizontalScrollTimeout = window.setTimeout(this._scrollHorizontally.bind(this), 40);
          }
        }
      }
      _checkVerticalScrolling(pageY) {
        const newVerticalScrollDirection = this._getNewVerticalScrollDirection(pageY);
        if (this._verticalScrollDirection !== newVerticalScrollDirection) {
          this._verticalScrollDirection = newVerticalScrollDirection;
          if (this._verticalScrollTimeout != null) {
            window.clearTimeout(this._verticalScrollTimeout);
            this._verticalScrollTimeout = undefined;
          }
          if (newVerticalScrollDirection) {
            this._verticalScrollTimeout = window.setTimeout(this._scrollVertically.bind(this), 40);
          }
        }
      }
      _getScrollLeft() {
        return this._container.scrollLeft;
      }
      _scrollToY(top) {
        this._container.scrollTop = top;
      }
      _stopScrolling() {
        this._horizontalScrollDirection = undefined;
        this._verticalScrollDirection = undefined;
      }
      _scrollHorizontally() {
        if (!this._horizontalScrollDirection) {
          return;
        }
        const distance = this._horizontalScrollDirection === "left" ? -20 : 20;
        this._container.scrollBy({
          behavior: "instant",
          left: distance,
          top: 0
        });
        this._refreshHitAreas();
        setTimeout(this._scrollHorizontally.bind(this), 40);
      }
      _scrollVertically() {
        if (!this._verticalScrollDirection) {
          return;
        }
        const distance = this._verticalScrollDirection === "top" ? -20 : 20;
        this._container.scrollBy({
          behavior: "instant",
          left: 0,
          top: distance
        });
        this._refreshHitAreas();
        setTimeout(this._scrollVertically.bind(this), 40);
      }
    }

    class ContainerScrollParent extends ScrollParent {
      _scrollParentBottom;
      _scrollParentTop;
      _stopScrolling() {
        super._stopScrolling();
        this._horizontalScrollDirection = undefined;
        this._verticalScrollDirection = undefined;
      }
      _getNewHorizontalScrollDirection(pageX) {
        const scrollParentOffset = getElementPosition(this._container);
        const containerWidth = this._container.getBoundingClientRect().width;
        const rightEdge = scrollParentOffset.left + containerWidth;
        const leftEdge = scrollParentOffset.left;
        const isNearRightEdge = pageX > rightEdge - 20;
        const isNearLeftEdge = pageX < leftEdge + 20;
        if (isNearRightEdge) {
          return "right";
        } else if (isNearLeftEdge) {
          return "left";
        }
        return undefined;
      }
      _getNewVerticalScrollDirection(pageY) {
        if (pageY < this._getScrollParentTop()) {
          return "top";
        }
        if (pageY > this._getScrollParentBottom()) {
          return "bottom";
        }
        return undefined;
      }
      _getScrollParentBottom() {
        if (this._scrollParentBottom == null) {
          const containerHeight = this._container.getBoundingClientRect().height;
          this._scrollParentBottom = this._getScrollParentTop() + containerHeight;
        }
        return this._scrollParentBottom;
      }
      _getScrollParentTop() {
        this._scrollParentTop ??= getOffsetTop(this._container);
        return this._scrollParentTop;
      }
    }

    class DocumentScrollParent extends ScrollParent {
      _documentScrollHeight;
      _documentScrollWidth;
      _treeElement;
      constructor({
        _refreshHitAreas: refreshHitAreas,
        _treeElement: treeElement
      }) {
        super({
          _container: document.documentElement,
          _refreshHitAreas: refreshHitAreas
        });
        this._treeElement = treeElement;
      }
      _scrollToY(top) {
        const treeTop = getOffsetTop(this._treeElement);
        super._scrollToY(top + treeTop);
      }
      _stopScrolling() {
        super._stopScrolling();
        this._documentScrollHeight = undefined;
        this._documentScrollWidth = undefined;
      }
      _getNewHorizontalScrollDirection(pageX) {
        const scrollLeft = this._container.scrollLeft;
        const windowWidth = window.innerWidth;
        const isNearRightEdge = pageX > windowWidth - 20;
        const isNearLeftEdge = pageX - scrollLeft < 20;
        if (isNearRightEdge && this._canScrollRight()) {
          return "right";
        }
        if (isNearLeftEdge) {
          return "left";
        }
        return undefined;
      }
      _getNewVerticalScrollDirection(pageY) {
        const scrollTop = this._container.scrollTop;
        const distanceTop = pageY - scrollTop;
        if (distanceTop < 20) {
          return "top";
        }
        const windowHeight = window.innerHeight;
        if (windowHeight - (pageY - scrollTop) < 20 && this._canScrollDown()) {
          return "bottom";
        }
        return undefined;
      }
      _canScrollDown() {
        return this._container.scrollTop + this._container.clientHeight < this._getDocumentScrollHeight();
      }
      _canScrollRight() {
        return this._container.scrollLeft + this._container.clientWidth < this._getDocumentScrollWidth();
      }
      _getDocumentScrollHeight() {
        // Store the original scroll height because the scroll height can increase when the drag element is moved beyond the scroll height.
        this._documentScrollHeight ??= this._container.scrollHeight;
        return this._documentScrollHeight;
      }
      _getDocumentScrollWidth() {
        // Store the original scroll width because the scroll width can increase when the drag element is moved beyond the scroll width.
        this._documentScrollWidth ??= this._container.scrollWidth;
        return this._documentScrollWidth;
      }
    }

    const isOverflow = overflowValue => overflowValue === "auto" || overflowValue === "scroll";
    const hasOverFlow = element => {
      const style = getComputedStyle(element);
      return isOverflow(style.overflowX) || isOverflow(style.overflowY);
    };
    const getParentWithOverflow = treeElement => {
      if (hasOverFlow(treeElement)) {
        return treeElement;
      }
      let parent = treeElement.parentElement;
      while (parent) {
        if (hasOverFlow(parent)) {
          return parent;
        }
        parent = parent.parentElement;
      }
      return null;
    };
    const createScrollParent = (treeElement, refreshHitAreas) => {
      const container = getParentWithOverflow(treeElement);
      if (container && container.tagName !== "HTML") {
        return new ContainerScrollParent({
          _container: container,
          _refreshHitAreas: refreshHitAreas
        });
      } else {
        return new DocumentScrollParent({
          _refreshHitAreas: refreshHitAreas,
          _treeElement: treeElement
        });
      }
    };

    class ScrollHandler {
      _refreshHitAreas;
      _scrollParent;
      _treeElement;
      constructor({
        _refreshHitAreas: refreshHitAreas,
        _treeElement: treeElement
      }) {
        this._refreshHitAreas = refreshHitAreas;
        this._scrollParent = undefined;
        this._treeElement = treeElement;
      }
      _checkScrolling(positionInfo) {
        this._checkVerticalScrolling(positionInfo);
        this._checkHorizontalScrolling(positionInfo);
      }
      _getScrollLeft() {
        return this._getScrollParent()._getScrollLeft();
      }
      _scrollToY(top) {
        this._getScrollParent()._scrollToY(top);
      }
      _stopScrolling() {
        this._getScrollParent()._stopScrolling();
      }
      _checkHorizontalScrolling(positionInfo) {
        this._getScrollParent()._checkHorizontalScrolling(positionInfo.pageX);
      }
      _checkVerticalScrolling(positionInfo) {
        this._getScrollParent()._checkVerticalScrolling(positionInfo.pageY);
      }
      _getScrollParent() {
        this._scrollParent ??= createScrollParent(this._treeElement, this._refreshHitAreas);
        return this._scrollParent;
      }
    }

    class SelectNodeHandler {
      _getNodeById;
      _getNodeElementForNode;
      _getOnCanSelectNode;
      _getSelectable;
      _openParents;
      _saveState;
      _selectedNodes;
      _selectedSingleNode;
      _triggerEvent;
      constructor({
        _getNodeById: getNodeById,
        _getNodeElementForNode: getNodeElementForNode,
        _getOnCanSelectNode: getOnCanSelectNode,
        _getSelectable: getSelectable,
        _openParents: openParents,
        _saveState: saveState,
        _triggerEvent: triggerEvent
      }) {
        this._getNodeById = getNodeById;
        this._getNodeElementForNode = getNodeElementForNode;
        this._getOnCanSelectNode = getOnCanSelectNode;
        this._getSelectable = getSelectable;
        this._openParents = openParents;
        this._saveState = saveState;
        this._selectedNodes = new Set();
        this._selectedSingleNode = null;
        this._triggerEvent = triggerEvent;
      }
      _addToSelection(node) {
        if (node.id != null) {
          this._selectedNodes.add(node.id);
        } else {
          this._selectedSingleNode = node;
        }
      }
      _clear() {
        this._selectedNodes.clear();
        this._selectedSingleNode = null;
      }
      _getSelectedNode() {
        const selectedNodes = this._getSelectedNodes();
        if (selectedNodes.length) {
          return selectedNodes[0] ?? null;
        } else {
          return null;
        }
      }
      _getSelectedNodes() {
        if (this._selectedSingleNode) {
          return [this._selectedSingleNode];
        } else {
          const selectedNodes = [];
          this._selectedNodes.forEach(id => {
            const node = this._getNodeById(id);
            if (node) {
              selectedNodes.push(node);
            }
          });
          return selectedNodes;
        }
      }
      _getSelectedNodesUnder(parent) {
        if (this._selectedSingleNode) {
          if (parent.isParentOf(this._selectedSingleNode)) {
            return [this._selectedSingleNode];
          } else {
            return [];
          }
        } else {
          const selectedNodes = [];
          this._selectedNodes.forEach(id => {
            const node = this._getNodeById(id);
            if (node && parent.isParentOf(node)) {
              selectedNodes.push(node);
            }
          });
          return selectedNodes;
        }
      }
      _isNodeSelected(node) {
        if (node.id != null) {
          return this._selectedNodes.has(node.id);
        } else if (this._selectedSingleNode) {
          return this._selectedSingleNode === node;
        } else {
          return false;
        }
      }
      _removeFromSelection(node, includeChildren = false) {
        if (node.id == null) {
          if (this._selectedSingleNode === node) {
            this._selectedSingleNode = null;
          }
        } else {
          this._selectedNodes.delete(node.id);
          if (includeChildren) {
            node.iterate(() => {
              if (node.id != null) {
                this._selectedNodes.delete(node.id);
              }
              return true;
            });
          }
        }
      }

      /* Select a single node.
       * Renders the changed elements.
       * Deselects if the node is currently selected (if the mustToggle is on).
       * Deselects the previously selected node.
       * Check if the node is selectable.
       * Saves the state.
       * Options:
       * mustSetFocus: set the focus to the selected node
       * mustToggle: support deselecting the selected node
       */
      _selectSingleNode(node, optionsParam) {
        const defaultOptions = {
          mustSetFocus: true,
          mustToggle: true
        };
        const selectOptions = {
          ...defaultOptions,
          ...(optionsParam ?? {})
        };
        const canSelect = () => {
          if (!this._getSelectable()) {
            return false;
          }
          const onCanSelectNode = this._getOnCanSelectNode();
          return onCanSelectNode ? onCanSelectNode(node) : true;
        };
        if (!canSelect()) {
          return;
        }
        const deselectCurrentNode = deselectedNode => {
          this._removeFromSelection(deselectedNode);
          this._getNodeElementForNode(deselectedNode)._deselect();
        };
        if (this._isNodeSelected(node)) {
          if (selectOptions.mustToggle) {
            deselectCurrentNode(node);
            this._triggerEvent("tree.deselect", {
              node
            });
          }
        } else {
          const deselectedNode = this._getSelectedNode();
          if (deselectedNode) {
            deselectCurrentNode(deselectedNode);
          }
          this._addToSelection(node);
          this._openParents(node);
          this._getNodeElementForNode(node)._select(selectOptions.mustSetFocus);
          this._triggerEvent("tree.select", {
            deselectedNode,
            node
          });
        }
        this._saveState();
      }
    }

    const defaults = {
      animationSpeed: "fast",
      autoEscape: true,
      autoOpen: false,
      // true / false / int (open n levels starting at 0)
      buttonLeft: true,
      classPrefix: DEFAULT_CLASS_PREFIX,
      // the prefix of all css classes
      // The symbol to use for a closed node - ► BLACK RIGHT-POINTING POINTER
      // http://www.fileformat.info/info/unicode/char/25ba/index.htm
      closedIcon: undefined,
      commonClassName: undefined,
      // the class of every element; the default is "<classPrefix>-common"
      data: undefined,
      dataFilter: undefined,
      dataUrl: undefined,
      dragAndDrop: false,
      keyboardSupport: true,
      nodeClass: Node,
      onCanMove: undefined,
      // Can this node be moved?
      onCanMoveTo: undefined,
      // Can this node be moved to this position? function(moved_node, target_node, position)
      onCanSelectNode: undefined,
      onCreateLi: undefined,
      onDragMove: undefined,
      onDragStop: undefined,
      onGetStateFromStorage: undefined,
      onIsMoveHandle: undefined,
      onSetStateFromStorage: undefined,
      openedIcon: undefined,
      openFolderDelay: 500,
      // The delay for opening a folder during drag and drop; the value is in milliseconds
      // The symbol to use for an open node - ▼ BLACK DOWN-POINTING TRIANGLE
      // http://www.fileformat.info/info/unicode/char/25bc/index.htm
      rtl: undefined,
      // right-to-left support; true / false (default)
      saveState: false,
      // true / false / string (local storage key; the default key is "tree")
      selectable: true,
      showEmptyFolder: false,
      slide: true,
      // must display slide animation?
      startDndDelay: 300,
      // The delay for starting dnd (in milliseconds)
      tabIndex: 0,
      treeClassName: undefined,
      // the class of the root element; the default is classPrefix
      useContextMenu: true
    };
    const setDefaultOptions = (htmlElement, inputOptions) => {
      const options = {
        ...defaults,
        ...inputOptions
      };
      options.dataUrl ??= htmlElement.dataset.url;
      options.rtl ??= getRtlOptionFromHTMLElement(htmlElement);
      options.closedIcon ??= getDefaultClosedIcon(options);
      options.openedIcon ??= "&#x25bc;";
      return options;
    };
    const getDefaultClosedIcon = options => {
      if (options.rtl) {
        // triangle to the left
        return "&#x25c0;";
      } else {
        // triangle to the right
        return "&#x25ba;";
      }
    };
    const getRtlOptionFromHTMLElement = htmlElement => {
      const dataRtl = htmlElement.dataset.rtl;
      if (dataRtl == "") {
        return true;
      } else if (dataRtl === "false") {
        return false;
      } else {
        return Boolean(dataRtl);
      }
    };

    // Trigger a CustomEvent. Return if the event is processed (true) or cancelled (false).
    const triggerCustomEvent = (element, eventName, values) => {
      const event = new CustomEvent(eventName, {
        bubbles: true,
        cancelable: true,
        detail: values
      });
      element.dispatchEvent(event);
      return !event.defaultPrevented;
    };

    // Generated by config/generateVersion.mjs. Do not edit.
    const version = "0.1.1";

    // The types that appear in the public api. Consumers cannot import them from
    // the submodules directly, because those are not exposed in package.json.
    // Type only, so that the iife build keeps exposing the TreeElement class itself
    // as its global, instead of an object of named exports.

    class TreeElement {
      _classNames;
      _dataLoader;
      _dndHandler;
      _htmlElement;
      _isInitialized;
      _keyHandler;
      _mouseHandler;
      _nodeMap;
      _options;
      _renderer;
      _saveStateHandler;
      _scrollHandler;
      _selectNodeHandler;
      _tree;
      _triggerEventProvider;

      /** @hidden */
      constructor({
        htmlElement,
        overrideTriggerEventProvider,
        ...options
      }) {
        this._htmlElement = htmlElement;
        this._options = setDefaultOptions(htmlElement, options);
        this._classNames = createClassNames(this._options);
        this._triggerEventProvider = overrideTriggerEventProvider ?? triggerCustomEvent;
        this._isInitialized = false;
        this._tree = new Node({}, true);
        this._nodeMap = new WeakMap();
        const {
          autoEscape,
          buttonLeft,
          closedIcon,
          dataFilter,
          dragAndDrop,
          keyboardSupport,
          onCanMove,
          onCanMoveTo,
          onCreateLi,
          onDragMove,
          onDragStop,
          onGetStateFromStorage,
          onIsMoveHandle,
          onSetStateFromStorage,
          openedIcon,
          openFolderDelay,
          rtl,
          saveState: saveStateOption,
          showEmptyFolder,
          slide,
          tabIndex
        } = this._options;
        const classNames = this._classNames;
        const closeNode = this.closeNode.bind(this);
        const getNodeElement = this._getNodeElement.bind(this);
        const getNodeElementForNode = this._getNodeElementForNode.bind(this);
        const getNodeById = this.getNodeById.bind(this);
        const getSelectedNode = this.getSelectedNode.bind(this);
        const getTree = this.getTree.bind(this);
        const isFocusOnTree = this._isFocusOnTree.bind(this);
        const loadData = this.loadData.bind(this);
        const openNode = this.openNode.bind(this);
        const openParents = this._openParents.bind(this);
        const refreshElements = this._refreshElements.bind(this);
        const refreshHitAreas = this.refreshHitAreas.bind(this);
        const setNodeElement = this._setNodeElement.bind(this);
        const treeElement = this._htmlElement;
        const triggerEvent = this._triggerEvent.bind(this);
        const saveState = () => {
          saveStateHandler._saveState();
        };
        const selectNodeHandler = new SelectNodeHandler({
          _getNodeById: getNodeById,
          _getNodeElementForNode: getNodeElementForNode,
          _getOnCanSelectNode: () => this._options.onCanSelectNode,
          _getSelectable: () => this._options.selectable,
          _openParents: openParents,
          _saveState: saveState,
          _triggerEvent: triggerEvent
        });
        const addToSelection = selectNodeHandler._addToSelection.bind(selectNodeHandler);
        const getSelectedNodes = selectNodeHandler._getSelectedNodes.bind(selectNodeHandler);
        const isNodeSelected = selectNodeHandler._isNodeSelected.bind(selectNodeHandler);
        const removeFromSelection = selectNodeHandler._removeFromSelection.bind(selectNodeHandler);
        const selectNode = selectNodeHandler._selectSingleNode.bind(selectNodeHandler);
        const getMouseDelay = () => this._options.startDndDelay ?? 0;
        const dataLoader = new DataLoader({
          _classNames: classNames,
          _dataFilter: dataFilter,
          _loadData: loadData,
          _treeElement: treeElement,
          _triggerEvent: triggerEvent
        });
        const saveStateHandler = new SaveStateHandler({
          _addToSelection: addToSelection,
          _getNodeById: getNodeById,
          _getSelectedNodes: getSelectedNodes,
          _getTree: getTree,
          _onGetStateFromStorage: onGetStateFromStorage,
          _onSetStateFromStorage: onSetStateFromStorage,
          _openNode: openNode,
          _refreshElements: refreshElements,
          _removeFromSelection: removeFromSelection,
          _saveState: saveStateOption
        });
        const scrollHandler = new ScrollHandler({
          _refreshHitAreas: refreshHitAreas,
          _treeElement: treeElement
        });
        const getScrollLeft = scrollHandler._getScrollLeft.bind(scrollHandler);
        const dndHandler = new DragAndDropHandler({
          _autoEscape: autoEscape,
          _classNames: classNames,
          _getNodeElement: getNodeElement,
          _getNodeElementForNode: getNodeElementForNode,
          _getScrollLeft: getScrollLeft,
          _getTree: getTree,
          _onCanMove: onCanMove,
          _onCanMoveTo: onCanMoveTo,
          _onDragMove: onDragMove,
          _onDragStop: onDragStop,
          _onIsMoveHandle: onIsMoveHandle,
          _openFolderDelay: openFolderDelay,
          _openNode: openNode,
          _refreshElements: refreshElements,
          _slide: slide,
          _treeElement: treeElement,
          _triggerEvent: triggerEvent
        });
        const keyHandler = new KeyHandler({
          _closeNode: closeNode,
          _getSelectedNode: getSelectedNode,
          _isFocusOnTree: isFocusOnTree,
          _keyboardSupport: keyboardSupport,
          _openNode: openNode,
          _selectNode: selectNode
        });
        const renderer = new ElementsRenderer({
          _autoEscape: autoEscape,
          _buttonLeft: buttonLeft,
          _classNames: classNames,
          _closedIcon: closedIcon,
          _dragAndDrop: dragAndDrop,
          _getTree: getTree,
          _htmlElement: treeElement,
          _isNodeSelected: isNodeSelected,
          _onCreateLi: onCreateLi,
          _openedIcon: openedIcon,
          _rtl: rtl,
          _setNodeElement: setNodeElement,
          _showEmptyFolder: showEmptyFolder,
          _tabIndex: tabIndex
        });
        const getNode = this.getNode.bind(this);
        const onMouseCapture = this._mouseCapture.bind(this);
        const onMouseDrag = this._mouseDrag.bind(this);
        const onMouseStart = this._mouseStart.bind(this);
        const onMouseStop = this._mouseStop.bind(this);
        const mouseHandler = new MouseHandler({
          _classNames: classNames,
          _element: treeElement,
          _getMouseDelay: getMouseDelay,
          _getNode: getNode,
          _onClickButton: this.toggle.bind(this),
          _onClickTitle: selectNode,
          _onMouseCapture: onMouseCapture,
          _onMouseDrag: onMouseDrag,
          _onMouseStart: onMouseStart,
          _onMouseStop: onMouseStop,
          _triggerEvent: triggerEvent,
          _useContextMenu: this._options.useContextMenu
        });
        this._dataLoader = dataLoader;
        this._dndHandler = dndHandler;
        this._keyHandler = keyHandler;
        this._mouseHandler = mouseHandler;
        this._renderer = renderer;
        this._saveStateHandler = saveStateHandler;
        this._scrollHandler = scrollHandler;
        this._selectNodeHandler = selectNodeHandler;
        this._initData();
      }

      /**
       * Adds a sibling after a node.
       *
       * @returns The new node, or `null` when the node has no parent.
       * @group Changing the tree
       */
      addNodeAfter(nodeData, existingNode) {
        const newNode = existingNode.addAfter(nodeData);
        if (newNode) {
          this._refreshElements(existingNode.parent);
        }
        return newNode;
      }

      /**
       * Adds a sibling before a node.
       *
       * @returns The new node, or `null` when the node has no parent.
       * @group Changing the tree
       */
      addNodeBefore(nodeData, existingNode) {
        const newNode = existingNode.addBefore(nodeData);
        if (newNode) {
          this._refreshElements(existingNode.parent);
        }
        return newNode;
      }

      /**
       * Inserts a new node between a node and its parent, taking the node as its
       * child.
       *
       * @returns The new node, or `null` when the node has no parent.
       * @group Changing the tree
       */
      addParentNode(nodeData, existingNode) {
        const newNode = existingNode.addParent(nodeData);
        if (newNode) {
          this._refreshElements(newNode.parent);
        }
        return newNode;
      }

      /**
       * Adds a node to the selection instead of replacing it.
       *
       * @param mustSetFocus - Move the focus to the node. Default `true`.
       * @group Selection
       */
      addToSelection(node, mustSetFocus) {
        this._selectNodeHandler._addToSelection(node);
        this._openParents(node);
        this._getNodeElementForNode(node)._select(mustSetFocus ?? true);
        this._saveState();
      }

      /**
       * Adds a node as the last child of a parent.
       *
       * @example
       * ```js
       * tree.appendNode({ name: "child", id: 5 }, tree.getNodeById(1));
       * ```
       *
       * @returns The new node.
       * @group Changing the tree
       */
      appendNode(nodeData, parentNode) {
        const node = parentNode.append(nodeData);
        this._refreshElements(parentNode);
        return node;
      }

      /**
       * Closes a folder.
       *
       * @param slide - Override the `slide` option for this call.
       * @group Opening and closing
       */
      closeNode(node, slide) {
        if (node.isFolder() || node.isEmptyFolder) {
          this._createFolderElement(node)._close(slide ?? this._options.slide, this._options.animationSpeed);
          this._saveState();
        }
      }

      /**
       * Empties the element and removes the tree's document-level keyboard
       * listener. Call it when you remove the tree from the page.
       *
       * @group Other
       */
      deinit() {
        this._htmlElement.textContent = "";
        this._dataLoader._deinit();
        this._keyHandler._deinit();
        this._mouseHandler._deinit();
        this._tree = new Node({}, true);
      }

      /**
       * Returns the node that belongs to a `li` element the tree rendered.
       *
       * @group Finding nodes
       */
      getNode(element) {
        const liElement = element.closest(`li.${this._classNames.common}`);
        if (liElement) {
          return this._nodeMap.get(liElement) ?? null;
        } else {
          return null;
        }
      }

      /**
       * Returns the first node for which the callback returns `true`.
       *
       * @example
       * ```js
       * const node = tree.getNodeByCallback((node) => node.children.length > 3);
       * ```
       *
       * @group Finding nodes
       */
      getNodeByCallback(callback) {
        return this._tree.getNodeByCallback(callback);
      }

      /**
       * Returns the node with this id.
       *
       * @example
       * ```js
       * const node = tree.getNodeById(1);
       * ```
       *
       * @group Finding nodes
       */
      getNodeById(id) {
        return this._tree.getNodeById(id);
      }

      /**
       * Returns the first node with this name.
       *
       * @group Finding nodes
       */
      getNodeByName(name) {
        return this._tree.getNodeByName(name);
      }

      /**
       * Like `getNodeByName`, but throws when there is no such node. Convenient
       * in tests and when a missing node is a bug.
       *
       * @group Finding nodes
       */
      getNodeByNameMustExist(name) {
        return this._tree.getNodeByNameMustExist(name);
      }

      /**
       * Returns all nodes with this property value.
       *
       * @example
       * ```js
       * tree.getNodesByProperty("color", "green");
       * ```
       *
       * @group Finding nodes
       */
      getNodesByProperty(key, value) {
        return this._tree.getNodesByProperty(key, value);
      }

      /**
       * Returns the selected node, or `null` when nothing is selected.
       *
       * @group Selection
       */
      getSelectedNode() {
        return this._selectNodeHandler._getSelectedNode();
      }

      /**
       * Returns the selected nodes.
       *
       * @group Selection
       */
      getSelectedNodes() {
        return this._selectNodeHandler._getSelectedNodes();
      }

      /**
       * Returns the current state — `open_nodes` and `selected_node` — whether or
       * not `saveState` is enabled.
       *
       * @group State
       */
      getState() {
        return this._saveStateHandler._getState();
      }

      /**
       * Returns the state as it is stored.
       *
       * @group State
       */
      getStateFromStorage() {
        return this._saveStateHandler._getStateFromStorage();
      }

      /**
       * Returns the root node. It is not rendered; its `children` are the
       * top-level nodes. Also available as the `tree` property.
       *
       * @group Finding nodes
       */
      getTree() {
        return this._tree;
      }

      /**
       * Returns the version of tree-element.
       *
       * @group Other
       */
      getVersion() {
        return version;
      }

      /**
       * Returns whether the user is dragging a node.
       *
       * @group Other
       */
      isDragging() {
        return this._dndHandler._isDragging;
      }

      /**
       * Returns whether the node is selected.
       *
       * @group Selection
       */
      isNodeSelected(node) {
        return this._selectNodeHandler._isNodeSelected(node);
      }

      /**
       * Loads data into the tree.
       *
       * @param parentNode - Replace this node's children instead of the whole
       * tree.
       * @group Loading data
       */
      loadData(data, parentNode) {
        if (data) {
          if (parentNode) {
            this._deselectNodes(parentNode);
            this._loadSubtree(data, parentNode);
          } else {
            this._initTree(data);
          }
          if (this.isDragging()) {
            this._dndHandler._refresh();
          }
        }
        this._triggerEvent("tree.set_data", {
          node: parentNode,
          treeData: data ?? undefined
        });
      }

      /**
       * Fetches data and loads it into the tree, or into `parentNode`.
       *
       * @param url - Defaults to the `dataUrl` option.
       * @group Loading data
       */
      async loadDataFromUrl(url, parentNode) {
        const requestUrl = url ? new RequestUrl(url) : this._createRequestUrl(parentNode);
        if (requestUrl) {
          await this._dataLoader._loadFromUrl(requestUrl, parentNode);
        }
      }

      /**
       * Selects the next visible node, like the down arrow key.
       *
       * @group Selection
       */
      moveDown() {
        const selectedNode = this.getSelectedNode();
        if (selectedNode) {
          this._keyHandler._moveDown(selectedNode);
        }
      }

      /**
       * Moves a node inside the tree.
       *
       * @example
       * ```js
       * tree.moveNode(tree.getNodeById(2), tree.getNodeById(1), "inside");
       * ```
       *
       * @param position - `"before"`, `"after"` or `"inside"`.
       * @group Changing the tree
       */
      moveNode(node, targetNode, position) {
        this._tree.moveNode(node, targetNode, position);
        this._refreshElements(null);
      }

      /**
       * Selects the previous visible node, like the up arrow key.
       *
       * @group Selection
       */
      moveUp() {
        const selectedNode = this.getSelectedNode();
        if (selectedNode) {
          this._keyHandler._moveUp(selectedNode);
        }
      }

      /**
       * Opens a folder, and the folders above it. A node marked `load_on_demand`
       * is fetched first, so await the promise when you need to know it is really
       * open.
       *
       * @example
       * ```js
       * await tree.openNode(node);
       * console.log("open");
       * ```
       *
       * @param slide - Override the `slide` option for this call.
       * @group Opening and closing
       */
      async openNode(node, slide) {
        const mustSlide = slide ?? this._options.slide;
        const doOpenNode = async (openedNode, slideOption) => {
          if (!node.children.length) {
            return;
          }
          const folderElement = this._createFolderElement(openedNode);
          await folderElement._open(slideOption, this._options.animationSpeed);
        };
        if (node.isFolder() || node.isEmptyFolder) {
          if (node.load_on_demand) {
            await this._loadFolderOnDemand(node, mustSlide);
          } else {
            let parent = node.parent;
            while (parent) {
              // nb: do not open root element
              if (parent.parent) {
                await doOpenNode(parent, false);
              }
              parent = parent.parent;
            }
            await doOpenNode(node, mustSlide);
            this._saveState();
          }
        }
      }

      /**
       * Adds a node as the first child of a parent.
       *
       * @returns The new node.
       * @group Changing the tree
       */
      prependNode(nodeData, parentNode) {
        const node = parentNode.prepend(nodeData);
        this._refreshElements(parentNode);
        return node;
      }

      /**
       * Re-renders the whole tree. Needed after changing node data directly
       * instead of through these methods.
       *
       * @group Changing the tree
       */
      refresh() {
        this._refreshElements(null);
      }

      /**
       * Recomputes the drop targets. Call this if the layout changes during a
       * drag.
       *
       * @group Other
       */
      refreshHitAreas() {
        this._dndHandler._refresh();
      }

      /**
       * Removes a node from the selection.
       *
       * @group Selection
       */
      removeFromSelection(node) {
        this._selectNodeHandler._removeFromSelection(node);
        this._getNodeElementForNode(node)._deselect();
        this._saveState();
      }

      /**
       * Removes a node and its children.
       *
       * @group Changing the tree
       */
      removeNode(node) {
        this._selectNodeHandler._removeFromSelection(node, true); // including children

        const parent = node.parent;
        node.remove();
        this._refreshElements(parent);
      }

      /**
       * Scrolls the node into view.
       *
       * @group Selection
       */
      scrollToNode(node) {
        if (!node.element) {
          return;
        }
        const top = getOffsetTop(node.element) - getOffsetTop(this._htmlElement);
        this._scrollHandler._scrollToY(top);
      }

      /**
       * Replaces the selection, and opens the parents of the node.
       *
       * @param node - `null` clears the selection.
       * @param options - `mustSetFocus`: move focus to the node, default `true`.
       * `mustToggle`: deselect the node if it is already selected, default
       * `false`.
       * @group Selection
       */
      selectNode(node, options) {
        if (!node) {
          // Called with empty node -> deselect current node
          this._deselectCurrentNode();
          this._saveStateHandler._saveState();
          return;
        }
        this._selectNodeHandler._selectSingleNode(node, options);
      }

      /**
       * Changes an option after construction. See
       * [Options](/reference/options#changing-an-option-later) for the caveats.
       *
       * @group Other
       */
      setOption(option, value) {
        this._options[option] = value;
      }

      /**
       * Applies a state to the tree.
       *
       * @group State
       */
      setState(state) {
        this._saveStateHandler._setInitialState(state);
        this._refreshElements(null);
      }

      /**
       * Closes an open node and opens a closed one.
       *
       * @param slide - Override the `slide` option for this call.
       * @group Opening and closing
       */
      toggle(node, slide = null) {
        const mustSlide = slide ?? this._options.slide;
        if (node.is_open) {
          this.closeNode(node, mustSlide);
        } else {
          void this.openNode(node, mustSlide);
        }
      }

      /**
       * Returns the tree as a json string, including changes made through the
       * api.
       *
       * @group Other
       */
      toJson() {
        return JSON.stringify(this._tree.getData());
      }

      /**
       * Updates the data of a node and re-renders it. A string updates just the
       * name.
       *
       * Changing the `id` re-indexes the node. `children` and `parent` are
       * ignored — use `loadData` or `moveNode` for those.
       *
       * @example
       * ```js
       * tree.updateNode(node, "new name");
       * tree.updateNode(node, { name: "new name", color: "red" });
       * ```
       *
       * @group Changing the tree
       */
      updateNode(node, data) {
        const idIsChanged = typeof data === "object" && data.id && data.id !== node.id;
        if (idIsChanged) {
          this._tree.removeNodeFromIndex(node);
        }
        node.setData(data);
        if (idIsChanged) {
          this._tree.addNodeToIndex(node);
        }
        if (typeof data === "object" && data.children && data.children instanceof Array) {
          node.removeChildren();
          if (data.children.length) {
            node.loadFromData(data.children);
          }
        }
        this._refreshElements(node);
      }
      _createFolderElement(node) {
        const classNames = this._classNames;
        const closedIconElement = this._renderer._closedIconElement;
        const getScrollLeft = this._scrollHandler._getScrollLeft.bind(this._scrollHandler);
        const openedIconElement = this._renderer._openedIconElement;
        const renderChildren = this._renderer._renderChildren.bind(this._renderer);
        const tabIndex = this._options.tabIndex;
        const treeElement = this._htmlElement;
        const triggerEvent = this._triggerEvent.bind(this);
        return new FolderElement({
          _classNames: classNames,
          _closedIconElement: closedIconElement,
          _getScrollLeft: getScrollLeft,
          _node: node,
          _openedIconElement: openedIconElement,
          _renderChildren: renderChildren,
          _tabIndex: tabIndex,
          _treeElement: treeElement,
          _triggerEvent: triggerEvent
        });
      }
      _createNodeElement(node) {
        const classNames = this._classNames;
        const getScrollLeft = this._scrollHandler._getScrollLeft.bind(this._scrollHandler);
        const tabIndex = this._options.tabIndex;
        const treeElement = this._htmlElement;
        return new NodeElement({
          _classNames: classNames,
          _getScrollLeft: getScrollLeft,
          _node: node,
          _tabIndex: tabIndex,
          _treeElement: treeElement
        });
      }

      /* Create a RequestUrl based on the url in the options.
       * Add a 'node' query parameter for loading on demand
       * Add a 'selected_node' query parameter if a node is selected.
       */
      _createRequestUrl(node) {
        const dataUrl = this._options.dataUrl;
        let url;
        if (typeof dataUrl === "function") {
          url = dataUrl(node);
        } else {
          url = dataUrl;
        }
        if (!url) {
          return null;
        }
        const requestUrl = new RequestUrl(url);
        if (node?.id) {
          // Load on demand of a subtree; add node parameter
          requestUrl._setSearchParam("node", node.id.toString());
        } else {
          // Add selected_node parameter
          const selectedNodeId = this._getNodeIdToBeSelected();
          if (selectedNodeId) {
            requestUrl._setSearchParam("selected_node", selectedNodeId.toString());
          }
        }
        return requestUrl;
      }
      _deselectCurrentNode() {
        const node = this.getSelectedNode();
        if (node) {
          this.removeFromSelection(node);
        }
      }

      // Deselect the children of the node.
      _deselectNodes(parentNode) {
        const selectedNodesUnderParent = this._selectNodeHandler._getSelectedNodesUnder(parentNode);
        for (const n of selectedNodesUnderParent) {
          this._selectNodeHandler._removeFromSelection(n);
        }
      }

      // Get the maximum level for auto open
      _getAutoOpenMaxLevel() {
        if (this._options.autoOpen === true) {
          return -1;
        } else if (typeof this._options.autoOpen === "number") {
          return this._options.autoOpen;
        } else if (typeof this._options.autoOpen === "string") {
          return parseInt(this._options.autoOpen, 10);
        }

        /* istanbul ignore next @preserve */
        return 0;
      }
      _getNodeElement(element) {
        const node = this.getNode(element);
        if (node) {
          return this._getNodeElementForNode(node);
        } else {
          return null;
        }
      }
      _getNodeElementForNode(node) {
        if (node.isFolder()) {
          return this._createFolderElement(node);
        } else {
          return this._createNodeElement(node);
        }
      }
      _getNodeIdToBeSelected() {
        return this._saveStateHandler._getNodeIdToBeSelected();
      }
      _initData() {
        if (this._options.data) {
          this.loadData(this._options.data);
        } else {
          const dataUrl = this._createRequestUrl();
          if (dataUrl) {
            void this.loadDataFromUrl();
          } else {
            this.loadData([]);
          }
        }
      }
      _initTree(data) {
        const doInit = () => {
          if (!this._isInitialized) {
            this._isInitialized = true;
            this._triggerEvent("tree.init");
          }
        };
        this._tree = new this._options.nodeClass(null, true, this._options.nodeClass);
        this._selectNodeHandler._clear();
        this._tree.loadFromData(data);
        const mustLoadOnDemand = this._setInitialState();
        this._refreshElements(null);
        if (mustLoadOnDemand) {
          // Load data on demand and then init the tree
          void this._setInitialStateOnDemand().then(doInit);
        } else {
          doInit();
        }
      }

      // Does an HTML element of the tree have the focus?
      _isFocusOnTree() {
        const activeElement = document.activeElement;

        /* istanbul ignore if */
        if (!activeElement) {
          return false;
        }

        // The keyboard must still work for input elements.
        const tagName = activeElement.tagName;
        if (tagName !== "A" && tagName !== "SPAN") {
          return false;
        }
        const node = this.getNode(activeElement);
        return node?.tree === this._tree;
      }
      _isSelectedNodeInSubtree(subtree) {
        const selectedNode = this.getSelectedNode();
        if (!selectedNode) {
          return false;
        } else {
          return subtree === selectedNode || subtree.isParentOf(selectedNode);
        }
      }
      async _loadFolderOnDemand(node, slide) {
        node.is_loading = true;
        await this.loadDataFromUrl(undefined, node);
        await this.openNode(node, slide);
      }
      _loadSubtree(data, parentNode) {
        parentNode.loadFromData(data);
        parentNode.load_on_demand = false;
        parentNode.is_loading = false;
        this._refreshElements(parentNode);
      }
      _mouseCapture(positionInfo) {
        if (!this._options.dragAndDrop) {
          return false;
        }
        return this._dndHandler._mouseCapture(positionInfo);
      }
      _mouseDrag(positionInfo) {
        /* istanbul ignore if */
        if (!this._options.dragAndDrop) {
          return false;
        }
        const result = this._dndHandler._mouseDrag(positionInfo);
        this._scrollHandler._checkScrolling(positionInfo);
        return result;
      }
      _mouseStart(positionInfo) {
        /* istanbul ignore if */
        if (!this._options.dragAndDrop) {
          return false;
        }
        return this._dndHandler._mouseStart(positionInfo);
      }
      _mouseStop(positionInfo) {
        /* istanbul ignore if */
        if (!this._options.dragAndDrop) {
          return false;
        }
        this._scrollHandler._stopScrolling();
        return this._dndHandler._mouseStop(positionInfo);
      }
      _openParents(node) {
        const parent = node.parent;
        if (parent?.parent && !parent.is_open) {
          void this.openNode(parent, false);
        }
      }

      /*
      Redraw the tree or part of the tree.
        from_node: redraw this subtree
      */
      _refreshElements(fromNode) {
        const mustSetFocus = this._isFocusOnTree();
        const mustSelect = fromNode ? this._isSelectedNodeInSubtree(fromNode) : false;
        this._renderer._render(fromNode);
        if (mustSelect) {
          this._selectCurrentNode(mustSetFocus);
        }
        this._triggerEvent("tree.refresh");
      }
      _saveState() {
        this._saveStateHandler._saveState();
      }
      _selectCurrentNode(mustSetFocus) {
        const node = this.getSelectedNode();
        if (node) {
          const nodeElement = this._getNodeElementForNode(node);
          nodeElement._select(mustSetFocus);
        }
      }

      // Set initial state, either by restoring the state or auto-opening nodes
      // result: must load nodes on demand?
      _setInitialState() {
        const restoreState = () => {
          // result: is state restored, must load on demand?
          const state = this._saveStateHandler._getStateFromStorage();
          if (!state) {
            return [false, false];
          } else {
            const mustLoadOnDemand = this._saveStateHandler._setInitialState(state);

            // return true: the state is restored
            return [true, mustLoadOnDemand];
          }
        };
        const autoOpenNodes = () => {
          // result: must load on demand?
          if (this._options.autoOpen === false) {
            return false;
          }
          const maxLevel = this._getAutoOpenMaxLevel();
          let mustLoadOnDemand = false;
          this._tree.iterate((node, level) => {
            if (node.load_on_demand) {
              mustLoadOnDemand = true;
              return false;
            } else if (!node.hasChildren()) {
              return false;
            } else {
              node.is_open = true;
              return level !== maxLevel;
            }
          });
          return mustLoadOnDemand;
        };
        let [isRestored, mustLoadOnDemand] = restoreState(); // eslint-disable-line prefer-const

        if (!isRestored) {
          mustLoadOnDemand = autoOpenNodes();
        }
        return mustLoadOnDemand;
      }

      // Set the initial state for nodes that are loaded on demand
      async _setInitialStateOnDemand() {
        return new Promise(resolve => {
          const restoreState = () => {
            const state = this._saveStateHandler._getStateFromStorage();
            if (!state) {
              return false;
            } else {
              void this._saveStateHandler._setInitialStateOnDemand(state).then(() => {
                resolve();
              });
              return true;
            }
          };
          const autoOpenNodes = () => {
            const maxLevel = this._getAutoOpenMaxLevel();
            let loadingCount = 0;
            const loadAndOpenNode = node => {
              loadingCount += 1;
              void this.openNode(node, false).then(() => {
                loadingCount -= 1;
                openNodes();
              });
            };
            const openNodes = () => {
              this._tree.iterate((node, level) => {
                if (node.load_on_demand) {
                  if (!node.is_loading) {
                    loadAndOpenNode(node);
                  }
                  return false;
                } else {
                  void this.openNode(node, false);
                  return level !== maxLevel;
                }
              });
              if (loadingCount === 0) {
                resolve();
              }
            };
            openNodes();
          };
          if (!restoreState()) {
            autoOpenNodes();
          }
        });
      }

      // Set this HTML element to this node in the node map.
      _setNodeElement(element, node) {
        this._nodeMap.set(element, node);
      }
      _triggerEvent(eventName, values) {
        return this._triggerEventProvider(this._htmlElement, eventName, values);
      }
    }

    return TreeElement;

})();
//# sourceMappingURL=tree_element.debug.js.map
