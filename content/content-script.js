
// script-global highlightButton pressed state variable
var highlightButtonPressed;

// get initial value of global pressed state variable
updateHighlightButtonPressed();

// update local highlightButton pressed state variable when
// global one updates
chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    if (request.action == "updateHighlightPressed") {
      updateHighlightButtonPressed();
    }
  }
)

/**
 *
 * Updates script-global highlightButton pressed state variable
 * to storage-global highlightButton pressed state variable.
 *
 */
function updateHighlightButtonPressed () {
  chrome.storage.sync.get(
    ['highlightPressed'],
    function (result) {
      highlightButtonPressed = result.highlightPressed;
    }
  );
};


const openTag = '<span id="webNotes" class="highlight">';
const closeTag = "</span>";
const tagName = "SPAN";

document.addEventListener("mouseup", function (e) {
  let s = window.getSelection();

  let ca = getCommonAncestor(s.anchorNode, s.focusNode);
  console.log("CommonAncestor: " + ca.nodeName);
  console.log(getOffset(s.anchorNode, ca) + s.anchorOffset);
  console.log(getOffset(s.focusNode, ca) + s.focusOffset);


  highlightArea(
      anchorNode=s.anchorNode,
      anchorOffset=s.anchorOffset,
      focusNode=s.focusNode,
      focusOffset=s.focusOffset
  );
  s.empty();

});

/**
 *
 * Returns object with data for nodes.
 *
 * @param {Node} node -- optional (default: null) --
 * @param {int} innerOffset -- optional (default: null) --
 * @param {int} outerOffset -- optional (default: null) --
 * @param {NodeList} ancestors -- optional (default: null) --
 * @param {Node} mark -- optional (default: null) --
 */
function constructNodeObject (node = null,
                              originalOffset = null,
                              innerOffset = null,
                              outerOffset = null,
                              ancestors = null,
                              mark = null) {
  return {node: node,
          originalOffset: originalOffset,
          innerOffset: innerOffset,
          outerOffset: outerOffset,
          ancestors: ancestors,
          mark: mark};
}

/**
 *
 * Highlights area between anchorNode and focusNode.
 *
 * @param {Node} anchorNode anchorNode from selection (window.getSelection())
 * @param {int} anchorNodeOffset anchorNodeOffset from selection (window.getSelection())
 * @param {Node} focusNode focusNode from selection (window.getSelection())
 * @param {int} focusNodeOffset focusNodeOffset from selection (window.getSelection())
 */
function highlightArea (anchorNode, anchorOffset, focusNode, focusOffset) {

  var anchor = constructNodeObject(node = anchorNode, originalOffset = anchorOffset);
  var focus = constructNodeObject(node = focusNode, originalOffset = focusOffset);

  // get common ancestor
  anchor.ancestors = getAncestors(anchorNode);
  focus.ancestors = getAncestors(focusNode);
  let commonAncestor = getCommonAncestor(anchorNode, focusNode, anchor.ancestors, focus.ancestors);

  // if the nodes are in a mark then we need the offset
  // to be looking at the start of that mark
  if ((anchor.mark = getMark(anchor.ancestors))) {
    anchor.innerOffset = getOffset(anchor.mark, commonAncestor);
  }
  else {
    anchor.innerOffset = getOffset(anchor.node, commonAncestor);
  }
  if ((focus.mark = getMark(focus.ancestors))) {
    focus.innerOffset = getOffset(focus.mark, commonAncestor);
  }
  else {
    focus.innerOffset = getOffset(focus.node, commonAncestor);
  }

  // anchor must alway be the one closest to top
  let trueAnchorOffset = anchor.innerOffset + anchor.originalOffset;
  let trueFocusOffset = focus.innerOffset + focus.originalOffset;
  if (trueAnchorOffset > trueFocusOffset) {
    swap(anchor, focus);
  }

  // check if all ancestors up to common ancestor are inline elements
  let inline = isParentInline(anchor.ancestors, commonAncestor) &&
               isParentInline(focus.ancestors, commonAncestor);

  // if all ancestors up to the common ancestors are inline elements
  // then there are no other elements in between that need highlighting
  if (inline) {
    if ((anchor.mark == focus.mark) && anchor.mark /* && some other check for inbetween elements*/) {
      // anchor and focus are in the same mark
      // unhighlight
      ;
    }
    else {
      // anchor and focus are not in the same mark or a mark at all
      if (anchor.parentNode == focus.parentNode) {
        // anchor and focus are siblings
        highlightSiblings(anchor, focus, commonAncestor);
      }
      else {
        // anchor and focus are not siblings, highlight each element on its own

      }
    }
  }
  // highlight inbetween elements
  else {
    ;
    // check for unhighlighting
    //highlightElements(anchor, focus, ancestor);
  }
}

/**
 *
 * Highlights area between siblings anchor node and focus node.
 *
 * @param {nodeData} anchor node at the begging of the highlight selection are
 * @param {nodeData} focus node at the end of the highlight selection area
 * @param {Node} commonAncestor commonAncestor of anchor and focus nodes
 */
function highlightSiblings (anchor, focus, commonAncestor) {

  // anchor.innerOffset
  if (anchor.mark) {
    // ...looks at the first character of the mark's closing tag
    anchor.innerOffset += openTag.length + anchor.mark.innerHTML.length;
    anchor.outerOffset = anchor.innerOffset + closeTag.length;
  }
  else {
    // ...looks at the first true character of the selection
    anchor.innerOffset += anchor.originalOffset;
    anchor.outerOffset = 0;
  }

  // focus.innerOffset
  if (focus.mark) {
    // ...looks at the first character of the mark's opening tag
    focus.outerOffset = focus.innerOffset + openTag.length;
  }
  else {
    // ...looks at the last true character if the selection
    focus.innerOffset += focus.originalOffset;
    focus.outerOffset = 0;
  }

  let c = commonAncestor; // syntactic sugar

  // get out of text node
  if (isElement(c)) c = c.innerHTML;
  else c = c.parentNode.innerHTML;

  let newHTML = "";
  if (!anchor.mark && !focus.mark) {
    newHTML = c.slice(0, anchor.innerOffset)
              + openTag
              + c.slice(anchor.innerOffset, focus.innerOffset)
              + closeTag
              + c.slice(focus.innerOffset);
  }
  else if (!anchor.mark && focus.mark) {
    newHTML = c.slice(0, anchor.innerOffset)
              + openTag
              + c.slice(anchor.innerOffset, focus.innerOffset)
              + c.slice(focus.outerOffset);
  }
  else if (anchor.mark && !focus.mark) {
    newHTML = c.slice(0, anchor.innerOffset)
              + c.slice(anchor.outerOffset, focus.innerOffset)
              + closeTag
              + c.slice(focus.innerOffset);
  }
  else /* anchor.mark && focus.mark */ {
      newHTML = c.slice(0, anchor.innerOffset)
              + c.slice(anchor.outerOffset, focus.innerOffset)
              + c.slice(focus.outerOffset);
  }

  if (isElement(commonAncestor)) {
    commonAncestor.innerHTML = newHTML;
  }
  else {
    commonAncestor.parentNode.innerHTML = newHTML;
  }

}

/**
 *
 * Returns true if all ancestors up to the commonAncestor are
 * inline elements.
 *
 * @param {NodeList} nodeAncestors
 * @param {Node} commonAncestor
 */
function isParentInline (nodeAncestors, commonAncestor) {

  let nodeAncestorIndex = indexof(nodeAncestors, commonAncestor);
  return checkTypes(nodeAncestors, nodeAncestorIndex);
}

/**
 *
 * Swaps the data between two objects of the same type.
 *
 * @param {Object} a
 * @param {Object} b
 */
function swap (a, b) {

  if (typeof(a) != typeof(b))
    throw new Error("Objects are not of the same type.")

  for (key of Object.keys(a)) {
    t = a[key];
    a[key] = b[key];
    b[key] = t;
  }
}

/**
 *
 * Returns true if the node is the designated mark for
 * highlighting with WebNotes.
 *
 * @param {Node} node node to check
 */
function isMark (node) {
  if (!node) return false;
  return (node.nodeName == tagName) && (node.id.slice(0,8) == "webNotes");
}

/**
 *
 * Returns True if node type is element.
 *
 * @param {Node} node node to check
 */
function isElement (node) {
  return node.nodeType == Node.ELEMENT_NODE;
}

/**
 *
 * Returns  the node in nodeList that is the designated
 * mark for highlighting with WebNotes.
 * Returns null if not found.
 *
 * @param {NodeList} nodeList list to search mark
 */
function getMark (nodeList) {

  for (node of nodeList) {
    if (isMark(node)) return node;
  }

  return null;
}

/**
 *
 * Returns true if nodeList contains a node with the designated
 * mark for highlighting with WebNotes.
 *
 * @param {NodeList} nodeList
 */
function isMarked (nodeList) {

  for (node of nodeList) {
    if (isMark(node)) return true;
  }

  return false;
}

/**
 *
 * Returns true if all nodes up to index have inline display.
 *
 * @param {NodeList} nodeList array of nodes to check through
 * @param {int} index stop checking at index
 */
function checkTypes (nodeList, index) {
  let inline = true;

  for (let i=0; i<index; i++) {
    if (nodeList[i].nodeType == Node.ELEMENT_NODE) {
      if (!isInline(nodeList[i])) return false;
    }
  }

  return inline;
}

/**
 *
 * Returns true if node's display is inline. Used for detecting
 * inline type tags (e.g. mark, span, strong etc)
 *
 * @param {Node} node node to check its display
 */
function isInline (node) {
  return window.getComputedStyle(node).display == "inline";
}

/**
 *
 * Wrapper function for getAncestorOffset and getSiblingOffset.
 * Returns node's offset relative to the commonAncestor's innerHTML.
 * Offset looks at the first character of the node's opening tag.
 *
 * @param {Node} node node to get the offset of
 * @param {Node} commonAncestor count offset relative to its innerHTML
 */
function getOffset (node, commonAncestor) {

  let offset = 0;

  // get ancestor Offset
  offset += getAncestorOffset(node, commonAncestor);

  // sibling Offset
  offset += getSiblingOffset(node);

  return offset;
}

/**
 *
 * Returns offset relative to commonAncestor's innerHTML, stops
 * at node's parent. Offset looks at the first character after
 * the node's parent opening tag.
 *
 * @param {Node} node node to get offset of
 * @param {Node} commonAncestor ancestor to start counting offset from
 */
function getAncestorOffset (node, commonAncestor) {

  let offset = 0;

  let ancestor = commonAncestor;

  // node's ancestry tree
  let ancestors = getAncestors(node);
  // node's greatest ancestor index in the ancestry tree
  let ancestorsIndex = indexof(ancestors, ancestor);

  // moving down the ancestry tree until we reach node's parent
  for (let i=ancestorsIndex-1; i>=0; i--) {

    // next ancestor's index relative to current ancestor's children
    let nextAncestor = ancestors[i];
    let childIndex = indexof(ancestor.childNodes, nextAncestor);

    // break when we reach node's parent
    if (node.parentNode == ancestor) break;

    // for each move down the ancestry tree add all characters
    // to the offset until we reach the next ancestor of node
    offset += nodeListInnerOffset(
      ancestor.childNodes,
      childIndex
    );

    // move down the ancestry tree
    ancestor = ancestors[i];

    // add the opening tag of the next ancestor
    offset += openTagLength(ancestor);

  }

  return offset;

}

/**
 *
 * Returns offset relative to the node's parent. Offset looks at
 * the first character of the node's opening tag.
 *
 * @param {Node} node node to get the offset of
 */
function getSiblingOffset (node) {

  let offset = 0;

  // node's siblings
  let childNodes = node.parentNode.childNodes;
  // node's index in array of siblings
  let nodeIndex = indexof(childNodes, node);

  // add all characters until we reach node's opening tag
  offset += nodeListInnerOffset(childNodes, nodeIndex);

  return offset;
}

/**
 *
 * Returns the length of the opening tag of the passed node.
 * Returns zero and throws exception if passed node is not
 * Node.ELEMENT_NODE.
 *
 * @param {Node} node get the length of node's opening tag
 */
function openTagLength (node) {

  let len = 0;

  // add characters of element Node
  if (isElement(node)) {
    // name length plus 2 for the '<' and '>' characters
    len += node.nodeName.length + 2;

    // add element attributes
    for (let i=0; i<node.attributes.length; i++) {
      // length of attribute name
      len += node.attributes[i].nodeName.length;
      // length of attribute value
      len += node.attributes[i].nodeValue.length;
      // various characters ('=',2*'"', whitespace)
      len += 4;
    }
  }

  else {
    throw `Node: ${node}\ndoes not have tags.`;
  }

  return len;
}

/**
 *
 * Returns the length of the closing tag of the passed node.
 * Returns zero and throws exception if passed node is not
 * Node.ELEMENT_NODE.
 *
 * @param {Node} node get the length of node's closing tag
 */
function closeTagLength (node) {

  let len = 0;

  if (isElement(node)) {
    // name length plus 3 for the '<', '>' and '/' characters
    len += node.nodeName.length + 3;
  }

  else {
    throw `Node: ${node}\ndoes not have tags.`;
  }

  return len;
}

/**
 *
 * Highlights text between the two elements
 *
 * @param {Node} anchorParentNode
 * @param {Node} focusParentNode
 */
function highlightElement (anchorParentNode, focusParentNode) {

  // find common ancestor between anchorParentNode and focusParentNode
  var commonAncestor = getCommonAncestor(anchorParentNode, focusParentNode);
  let childNodes = commonAncestor.childNodes;

  let anchorAncestors = getAncestors(anchorParentNode);
  let oldestAnchorNode = anchorAncestors[indexof(anchorAncestors, commonAncestor) - 1];
  let focusAncestors = getAncestors(focusParentNode);
  let oldestFocusNode = focusAncestors[indexof(focusAncestors, commonAncestor) - 1];

  let anchorIndex = indexof(childNodes, oldestAnchorNode);
  let focusIndex = indexof(childNodes, oldestFocusNode);

  if (anchorIndex < 0 || focusIndex < 0) {
    throw "Common ancestor error.";
  }

  for (let i=anchorIndex+1; i<focusIndex; i++) {
      if (childNodes[i].nodeType == Node.ELEMENT_NODE) {
        childNodes[i].innerHTML = openTag + childNodes[i].innerHTML + closeTag;
      }
  }

}

/**
 *
 * Returns total count of characters (innerOffset) of all nodes up to index.
 *
 * @param {NodeList} nodeList list of nodes to iterate through
 * @param {integer} index index of node to stop at
 */
function nodeListInnerOffset (nodeList, index) {

  let innerOffset = 0;

  for (let i=0; i<index; i++) {

    // add characters of element Node
    if (nodeList[i].nodeType == Node.ELEMENT_NODE) {
      // 2 times the name length plus 5 for the '<', '>' and '/' characters
      innerOffset += 2*nodeList[i].nodeName.length + 5;

      // add element attributes
      for (let j=0; j<nodeList[i].attributes.length; j++) {
        // length of attribute name
        innerOffset += nodeList[i].attributes[j].nodeName.length;
        // length of attribute value
        innerOffset += nodeList[i].attributes[j].nodeValue.length;
        // various characters ('=',2*'"', whitespace)
        innerOffset += 4;
      }

      // add element innerHTML
      innerOffset += nodeList[i].innerHTML.length;
    }

    // add characters of text node
    else {
      innerOffset += nodeList[i].wholeText.length;
    }
  }

  return innerOffset;
}

/**
 *
 * Returns index of node in NodeList.
 *
 * @param {NodeList} nodeList list of nodes to search
 * @param {Node} key node to search list for
 */
function indexof (nodeList, key) {

  for (let i=0;i<nodeList.length;i++) {
    if (nodeList[i] == key) return i;
  }

  return -1;
}

/**
 *
 * Returns an array with all of the nodes ancestors.
 * First element is node itself.
 *
 * @param {Node} node node to get all ancestors of
 *
 */
function getAncestors (node) {

  let nodes = [];

  while (node) {
    // stops when it reaches document.parentNode -> null
    nodes.push(node);
    node = node.parentNode;
  }

  return nodes;

}

/**
 *
 * Returns the closest common ancestor between two nodes.
 * Can optionally pass NodeLists with the ancestors.
 *
 * @param {Node} a
 * @param {Node} b
 * @param {NodeList} ancestors_a -- optional (default: null) -- ancestors of node a
 * @param {NodeList} ancestors_b -- optional (default: null) -- ancestors of node b
 *
 */
function getCommonAncestor (a, b, ancestors_a = null, ancestors_b = null) {

  // get both nodes' ancestry tree
  if (!ancestors_a) ancestors_a = getAncestors(a);
  if (!ancestors_b) ancestors_b = getAncestors(b);

  // greates ancestor must be the same
  if (ancestors_a[ancestors_a.length] != ancestors_b[ancestors_b.length]) {
    throw "No common ancestor.";
  }

  // return the greatest ancestor that belongs to both ancestry trees
  for (let i=ancestors_a.length, j=ancestors_b.length; i >= 0 && j >= 0; i--, j--) {
    if (ancestors_a[i] != ancestors_b[j]) return ancestors_a[i + 1], ancestors_b[j + 1];
  }

  // ancestors are the same so nodes are the same
  return a;
}
