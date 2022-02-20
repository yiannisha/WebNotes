
// popup.js

const highlightButton = document.getElementById("highlightButton");

// set initial button toggle state equal to the global variable
chrome.storage.sync.get(
  ['highlightPressed'],
  function (result) {
    if (result.highlightPressed) {
      highlightButton.classList.add("pressed");
    }
    else {
      highlightButton.classList.remove("pressed");
    }
  }
);

// keep track of button state with a global variable in storage
highlightButton.addEventListener("click", toggleButton);

/**
 *
 * Changes the global highlightPressed variable and
 * toggles the button's pressed class.
 *
 * @param target button to be toggled
 *
 */
function toggleButton (target) {

  // toggle pressed class
  highlightButton.classList.toggle("pressed");

  // update highlightPressed variable
  chrome.storage.sync.get(['highlightPressed'],
    function (result) {
      chrome.storage.sync.set(
        { highlightPressed: !result.highlightPressed },
        function () {
          console.log("highlightPressed value changed to " + !result.highlightPressed);
        });
      });

  // sendMessage to content-script.js to update
  chrome.tabs.query(
    {active: true, currentWindow: true},
    function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "updateHighlightPressed"});
    }
  );
}
