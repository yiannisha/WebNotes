
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



var markCounter = 0;

const openTag = '<span id="webNotes" class="highlight">';
const closeTag = "</span>";
const tagName = "SPAN";

var openTagOffsets = [];
var closeTagOffsets = [];

document.addEventListener("mouseup", function (e) {
  if (highlightButtonPressed) {
    let s = window.getSelection();

    if (s.toString().length < 1) {
      throw "Selection too small... aborting";
    }

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
  }
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
  anchor.mark = getMark(anchor.ancestors);
  anchor.innerOffset = getOffset(anchor.node, commonAncestor);
  focus.mark = getMark(focus.ancestors);
  focus.innerOffset = getOffset(focus.node, commonAncestor);

  // anchor must alway be the one closest to top
  let trueAnchorOffset = anchor.innerOffset + anchor.originalOffset;
  let trueFocusOffset = focus.innerOffset + focus.originalOffset;
  if (trueAnchorOffset > trueFocusOffset) {
    swap(anchor, focus);
  }

  if ((anchor.node == focus.node) && !anchor.mark) {

    // to be put in function

    let trueAnchorOffset = anchor.innerOffset + anchor.originalOffset;
    let trueFocusOffset = focus.innerOffset + focus.originalOffset;

    openTagOffsets.push(trueAnchorOffset);
    closeTagOffsets.push(trueFocusOffset);

  }
  else {


    let anchorAncestryLevel, focusAncestryLevel;

    if (anchor.ancestors.length < focus.ancestors.length) {
      focusAncestryLevel = focus.ancestors.length - anchor.ancestors.length;
      anchorAncestryLevel = 0;
    }
    else {
      focusAncestryLevel = 0;
      anchorAncestryLevel = anchor.ancestors.length - focus.ancestors.length;
    }

    // highlight anchor node
    let trueAnchorOffset = anchor.innerOffset + anchor.originalOffset;
    let closeAnchorOffset = anchor.innerOffset + (isElement(anchor.node) ? anchor.node.innerHTML.length : anchor.node.nodeValue.length);

    openTagOffsets.push(trueAnchorOffset);
    closeTagOffsets.push(closeAnchorOffset);

    // highlight siblings of anchor node

    let prevNode = anchor.node;
    let node = prevNode.nextSibling;
    let innerOffset = closeAnchorOffset;
    let outerOffset = innerOffset;

    let reachFocus = false;

    while (node) {

      if (node == focus.ancestors[focusAncestryLevel]) {
        console.log("reached focusnode");
        reachFocus = true;
        break;
      }

      innerOffset = outerOffset + (isElement(prevNode) ? closeTagLength(prevNode) : 0) + (isElement(node) ? openTagLength(node) : 0);
      outerOffset = innerOffset + (isElement(node) ? node.innerHTML.length : node.nodeValue.length);

      openTagOffsets.push(innerOffset);
      closeTagOffsets.push(outerOffset);

      prevNode = node;
      node = node.nextSibling;
    }


    // highlight focus

    let openFocusOffset = focus.innerOffset;
    let trueFocusOffset = focus.innerOffset + focus.originalOffset;

    openTagOffsets.push(openFocusOffset);
    closeTagOffsets.push(trueFocusOffset);

    // highlight previous siblings of focus node

    prevNode = focus.node;
    node = prevNode.previousSibling;
    innerOffset = openFocusOffset;
    outerOffset = innerOffset;

    if (!reachFocus) {
      while (node) {

        if (node == anchor.ancestors[anchorAncestryLevel]) {
          console.log("reached anchornode");
          break;
        }

        innerOffset = outerOffset - (isElement(prevNode) ? openTagLength(prevNode) : 0) - (isElement(node) ? closeTagLength(node) : 0);
        outerOffset = innerOffset - (isElement(node) ? node.innerHTML.length : node.nodeValue.length);

        openTagOffsets.push(outerOffset);
        closeTagOffsets.push(innerOffset);

        prevNode = node;
        node = node.previousSibling;
      }
    }

  }

  addTags();
  openTagOffsets = [];
  closeTagOffsets = [];

}

/**
 *
 * Adds tags to document.body.innerHTML.
 *
 */
function addTags () {

  // copy of document.body.innerHTML -- not reference!
  let t = document.body.innerHTML;
  // aggregated difference to offset caused by the tags
  let diff = 0;

  // sort offset lists in ascending order
  openTagOffsets.sort(function(a, b) { return a-b; });
  closeTagOffsets.sort(function (a, b) { return a - b; });

  // add open tags
  let i = 0, j = 0;
  while (i < openTagOffsets.length || j < closeTagOffsets.length) {

    let tag;
    let offset;
    // always add the one with the less offset

    if (openTagOffsets[i] < closeTagOffsets[j]) {
      tag = addOpenTag();
      offset = openTagOffsets[i++] + diff;
    }
    else {
      tag = closeTag;
      offset = closeTagOffsets[j++] + diff;
     }

    // add tag to the copy
    t = t.slice(0, offset) + tag + t.slice(offset);
    // increment aggregated difference with the length of the current tag
    diff += tag.length;
  }

  // openTagOffsets.length == closeTagOffsets is always true
  // so i and j are always going to be openTagOffsets.length - 1

  // replaces actual body.innerHTML with the new one
  document.body.innerHTML = t;

}

/**
 *
 * Highlights area between sibling text nodes, anchor node and focus node.
 *
 * @param {nodeData} anchor node at the begging of the highlight selection are
 * @param {nodeData} focus node at the end of the highlight selection area
 * @param {Node} commonAncestor commonAncestor of anchor and focus nodes
 */
function highlightSiblings (anchor, focus, commonAncestor) {

  anchor.innerOffset += anchor.originalOffset;
  focus.innerOffset += focus.originalOffset;

  let c = commonAncestor; // syntactic sugar

  // get out of text node
  if (isElement(c)) c = c.innerHTML;
  else c = c.parentNode.innerHTML;

  newHTML = c.slice(0, anchor.innerOffset)
            + addOpenTag()
            + c.slice(anchor.innerOffset, focus.innerOffset)
            + closeTag
            + c.slice(focus.innerOffset);

  if (isElement(commonAncestor)) {
    commonAncestor.innerHTML = newHTML;
  }
  else {
    commonAncestor.parentNode.innerHTML = newHTML;
  }

}

/**
 *
 * Highlights elements between anchor and focus.
 *
 * @param {Object} anchor
 * @param {Object} focus
 * @param {Node} commonAncestor
 */
function highlightElementsArea (anchor, focus) {

  // anchor

  let commonAncestor = document.body;
  let node = anchor.node.nextSibling;

  while (node) {

    let innerOffset = getOffset(node, commonAncestor);
    let outerOffset = innerOffset + (isElement(node) ? node.innerHTML.length : node.nodeValue.length);

    if (isElement(node)) {
      let t = node.innerHTML;
      node.innerHTML = addOpenTag() + t + closeTag;
    }
    else {
      console.log(2);
      let t = commonAncestor.innerHTML;
      document.body.innerHTML = t.slice(0, innerOffset)
                               + addOpenTag()
                               + t.slice(innerOffset, outerOffset)
                               + closeTag
                               + t.slice(outerOffset);
    }

    node = node.nextSibling;
  }

}

/**
 *
 * Returns a formatted openTag string and increments the counter.
 *
 */
function addOpenTag () {
  return openTag.slice(0,18) + markCounter++ + openTag.slice(18);
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
 * Offset looks at the first character of the node's opening tag (if it's an element node)
 * or the first character of the node's text (if it's a text node).
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

  // console.log(node.nodeName);
  // if (node == document.body) return offset;

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
 * Highlights text at the edges of an area with different elements.
 *
 * @param {Object} anchor
 * @param {Object} focus
 * @param {Node} commonAncestor
 */
function highlightAreaEdges (anchor, focus, commonAncestor) {

  let newHTML = "";
  let p = commonAncestor.innerHTML // syntactic sugar

  // anchor.outerOffset at end of text node
  anchor.outerOffset = anchor.innerOffset + anchor.node.nodeValue.length;
  // anchor.innerOffset at true offset
  anchor.innerOffset += anchor.originalOffset;

  // focus.outerOffset at the true offset
  focus.outerOffset = focus.innerOffset + focus.originalOffset;
  // focus.innerOffset is at beggining of text node (already)

  newHTML = p.slice(0, anchor.innerOffset)
          + addOpenTag()
          + p.slice(anchor.innerOffset, anchor.outerOffset)
          + closeTag
          + p.slice(anchor.outerOffset, focus.innerOffset)
          + addOpenTag()
          + p.slice(focus.innerOffset, focus.outerOffset)
          + closeTag
          + p.slice(focus.outerOffset);

  // highlight anchor siblings
  // let innerOffset = anchor.outerOffset + (isElement(anchor.node) ? closeTagLength(anchor.node):0);
  // let outerOffset = innerOffset;
  // let node = anchor.node.nextSibling;
  // while (node) {
  //   innerOffset = outerOffset + (isElement(node) ? openTagLength(node) : 0);
  //   outerOffset += (isElement(node) ? node.innerHTML.length : node.nodeValue.length);
  //
  //
  //   node = node.nextSibling;
  // }

  commonAncestor.innerHTML = newHTML;
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
        childNodes[i].innerHTML = addOpenTag() + childNodes[i].innerHTML + closeTag;
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

  return document.body;
  //
  // // get both nodes' ancestry tree
  // if (!ancestors_a) ancestors_a = getAncestors(a);
  // if (!ancestors_b) ancestors_b = getAncestors(b);
  //
  // // greates ancestor must be the same
  // if (ancestors_a[ancestors_a.length] != ancestors_b[ancestors_b.length]) {
  //   throw "No common ancestor.";
  // }
  //
  // // return the greatest ancestor that belongs to both ancestry trees
  // for (let i=ancestors_a.length, j=ancestors_b.length; i >= 0 && j >= 0; i--, j--) {
  //   if (ancestors_a[i] != ancestors_b[j]) return ancestors_a[i + 1], ancestors_b[j + 1];
  // }
  //
  // // ancestors are the same so nodes are the same
  // return a;
}
