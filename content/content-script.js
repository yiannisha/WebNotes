
const openTag = "<mark>";
const closeTag = "</mark>";

document.addEventListener("mouseup", function (e) {
  let s = window.getSelection();
  console.log(s);
  let myAnchorElem = s.anchorNode;
  let myAnchorOffset = s.anchorOffset;
  let myFocusElem = s.focusNode;
  let myFocusOffset = s.focusOffset;
  console.log(`(${myAnchorElem.parentElement.id}, ${myFocusElem.parentElement.id})`);
  console.log(`Offset at element with id: ${myAnchorElem.parentElement.id} is: ${myAnchorOffset}`);
  console.log(`Offset at element with id: ${myFocusElem.parentElement.id} is: ${myFocusOffset}`);


  highlight(
      anchorNode=myAnchorElem,
      anchorOffset=myAnchorOffset,
      focusNode=myFocusElem,
      focusOffset=myFocusOffset
  );
  s.empty();
});

/**
 *
 * Highlights selected text with <mark> tags modifying the innerHTML of the first
 * and last elements. (anchor element and focus element)
 *
 * @param {} anchorNode selection.anchorNode
 * @param {} anchorOffset selection offset in anchorNode
 * @param {} focusNode selection.focusNode
 * @param {} focusOffset selection offset in focusNode
 */
function highlight (anchorNode, anchorOffset, focusNode, focusOffset) {

  // All changes and offsets are relative to each node's parentNode.innerHTML
  var anchorParentNode = anchorNode.parentNode;
  var anchorNodeIsMark = false;
  var anchorInnerOffset = 0;    // offset of <mark> relative to anchorParentNode.innerHTML
  var anchorOuterOffset = 0;    // anchorInnerOffset + "<mark>".length

  var focusParentNode = focusNode.parentNode;
  var focusNodeIsMark = false;
  var focusInnerOffset = 0;     // offset of </mark> relative to focusParentNode.innerHTML
  var focusOuterOffset = 0;     // focusInnerOffset + "<mark>".length

  var anchorMarkNode = undefined;
  var focusMarkNode = undefined;

  // find the values of Inner Offsets

  // anchorInnerOffset
  if (anchorParentNode.nodeName == 'MARK') {

    anchorNodeIsMark = true;
    anchorMarkNode = anchorParentNode;
    anchorParentNode = anchorParentNode.parentNode;

    let childNodes = anchorParentNode.childNodes;
    // find anchorMarkNode in childNodes
    let markIndex = indexof(childNodes, anchorMarkNode);

    // get offset in anchorParentNode.innerHTML
    anchorInnerOffset = nodeListInnerOffset(childNodes, markIndex);
    // anchorInnerOffset is looking at the last character before <mark>
  }
  else {
    let childNodes = anchorParentNode.childNodes;

    let anchorIndex = indexof(childNodes, anchorNode);
    // get offset in anchorParentNode.innerHTML
    anchorInnerOffset = nodeListInnerOffset(childNodes, anchorIndex);

    // add anchorOffset
    anchorInnerOffset += anchorOffset;
    // anchorOffset is looking at the start of the selection
  }

  // focusInnerOffset
  if (focusParentNode.nodeName == 'MARK') {

    focusNodeIsMark = true;
    focusMarkNode = focusParentNode;
    focusParentNode = focusParentNode.parentNode;

    let childNodes = focusParentNode.childNodes;
    // find markNode in childNodes
    let markIndex = indexof(childNodes, focusMarkNode);

    // get offset in innerHTML of focusParentNode
    focusInnerOffset = nodeListInnerOffset(childNodes, markIndex);
    // focusOffset is looking at the last character before <mark>
  }
  else {
    let childNodes = focusParentNode.childNodes;

    let focusIndex = indexof(childNodes, focusNode);
    // get offset in focusParentNode.innerHTML
    focusInnerOffset = nodeListInnerOffset(childNodes, focusIndex);

    // add focusOffset
    focusInnerOffset += focusOffset;
    // focusInnerOffset is looking at the end of the selection
  }

  // exchange the values of anchorNode and focusNode so that anchorNode is always first

  // anchorParentNode position
  let anchorY = anchorParentNode.getBoundingClientRect().y;
  let anchorX = anchorParentNode.getBoundingClientRect().x;
  // focusParentNode position
  let focusY  = focusParentNode.getBoundingClientRect().y;
  let focusX  = focusParentNode.getBoundingClientRect().x;
  // False if anchorNode is the closest to the top left
  let posCheck = ((anchorY > focusY) || (anchorX < focusX))

  // False if start of selection is before end of selection
  let parentCheck = ((anchorParentNode == focusParentNode) && (anchorInnerOffset > focusInnerOffset));

  // False if  anchorNode is not body
  let body = document.body;
  let bodyCheck = ((anchorNode == body));

  if (posCheck || parentCheck) {
    let tInner = anchorInnerOffset
    let tMark = anchorNodeIsMark
    let tMarkNode = anchorMarkNode;
    let tParent = anchorParentNode;

    anchorInnerOffset = focusInnerOffset;
    anchorNodeIsMark = focusNodeIsMark;
    anchorMarkNode = focusMarkNode;
    anchorParentNode = focusParentNode;

    focusMarkNode = tMarkNode;
    focusInnerOffset = tInner;
    focusNodeIsMark = tMark;
    focusParentNode = tParent;
  }

  // find the values of Outer Offsets
  if (anchorNodeIsMark) {
    anchorInnerOffset += openTag.length + anchorMarkNode.innerHTML.length;
    // anchorInnerOffset now looks at the last character before </mark>
    anchorOuterOffset = anchorInnerOffset + closeTag.length;
    // anchorOuterOffser looks at the first character after </mark>
  }
  if (focusNodeIsMark) {
    focusOuterOffset = focusInnerOffset + openTag.length;
    // focusOuterOffset now looks at the first character after <mark>
  }

  // debug

    console.log("anchorInnerOffset: ", anchorInnerOffset);
    console.log("anchorOuterOffset: ", anchorOuterOffset);
    console.log("anchorParentNode: ", anchorParentNode);
    console.log("anchorNode: ", anchorNode);
    console.log("focusInnerOffset: ", focusInnerOffset);
    console.log("focusOuterOffset: ", focusOuterOffset);
    console.log("focusParentNode: ", focusParentNode);
    console.log("focusNode: ", focusNode);

  // modify innerHTML

  if (anchorParentNode == focusParentNode) {

    // syntactic sugar
    let pHTML = anchorParentNode.innerHTML;

    if(!anchorNodeIsMark && !focusNodeIsMark) {
      // add <mark></mark> around selection
      anchorParentNode.innerHTML = pHTML.slice(0, anchorInnerOffset)
                                 + openTag
                                 + pHTML.slice(anchorInnerOffset, focusInnerOffset)
                                 + closeTag
                                 + pHTML.slice(focusInnerOffset);
    }

    else if (anchorNodeIsMark && !focusNodeIsMark) {
      // move </mark> to the end of the selection
      anchorParentNode.innerHTML = pHTML.slice(0, anchorInnerOffset)
                                 + pHTML.slice(anchorOuterOffset, focusInnerOffset)
                                 + closeTag
                                 + pHTML.slice(focusInnerOffset);
    }

    else if (!anchorNodeIsMark && focusNodeIsMark) {
      // move <mark> to the start of the selection
      anchorParentNode.innerHTML = pHTML.slice(0, anchorInnerOffset)
                                 + openTag
                                 + pHTML.slice(anchorInnerOffset, focusInnerOffset)
                                 + pHTML.slice(focusOuterOffset);
    }

    else {
      if (anchorMarkNode != focusMarkNode) {
        // remove </mark><mark> around selection to join highlighted areas together
        anchorParentNode.innerHTML = pHTML.slice(0, anchorInnerOffset)
                                   + pHTML.slice(anchorOuterOffset, focusInnerOffset)
                                   + pHTML.slice(focusOuterOffset);
      }
    }

  }
  else {

    // syntactic sugar
    let apHTML = anchorParentNode.innerHTML;
    let fpHTML = focusParentNode.innerHTML;

    if (anchorNodeIsMark) {
      // move </mark> to the end of the element
      anchorParentNode.innerHTML = apHTML.slice(0, anchorInnerOffset)
                                 + apHTML.slice(anchorOuterOffset)
                                 + closeTag;
    }
    else {
      // add <mark> at the start of selection and </mark> at the end of the element
      anchorParentNode.innerHTML = apHTML.slice(0, anchorInnerOffset)
                                 + openTag
                                 + apHTML.slice(anchorInnerOffset)
                                 + closeTag;
    }

    if (focusNodeIsMark) {
      // move <mark> at the start of the element
      focusParentNode.innerHTML  = openTag
                                 + fpHTML.slice(0, focusInnerOffset)
                                 + fpHTML.slice(focusOuterOffset);
    }
    else {
      // add <mark> at the start of the element and </mark> at the end of selection
      focusParentNode.innerHTML  = openTag
                                 + fpHTML.slice(0, focusInnerOffset)
                                 + closeTag
                                 + fpHTML.slice(focusInnerOffset);
    }

    highlightElements(anchorParentNode, focusParentNode);
  }

}

/**
 *
 * Highlights text between the two elements
 *
 * @param {Node} anchorParentNode
 * @param {Node} focusParentNode
 */
function highlightElements (anchorParentNode, focusParentNode) {

  // find common ancestor between anchorParentNode and focusParentNode
  var commonAncestor = closestCommonAncestor(anchorParentNode, focusParentNode);
  let childNodes = commonAncestor.childNodes;

  let anchorAncestors = ancestors(anchorParentNode);
  let oldestAnchorNode = anchorAncestors[indexof(anchorAncestors, commonAncestor) - 1];
  let focusAncestors = ancestors(focusParentNode);
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
      console.log(nodeList[i], innerOffset);
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
      console.log("innerOffset: ", innerOffset);
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
function ancestors (node) {

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
 *
 * @param {Node} a
 * @param {Node} b
 *
 */
function closestCommonAncestor (a, b) {

  let ancestors_a = ancestors(a);
  let ancestors_b = ancestors(b);

  if (ancestors_a[ancestors_a.length] != ancestors_b[ancestors_b.length]) {
    throw "No common ancestor.";
  }

  for (let i=ancestors_a.length, j=ancestors_b.length; i >= 0 && j >= 0; i--, j--) {
    if (ancestors_a[i] != ancestors_b[j]) return ancestors_a[i + 1], ancestors_b[j + 1];
  }

}
